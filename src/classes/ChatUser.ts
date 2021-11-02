'use strict';
import {v4 as uuidv4} from "uuid";
import fs from "fs";

import config from "../config.json";
import { Message } from "./Message";
import { ChatServer } from "./ChatServer";
import { Pair } from "./Pair";

import {log} from "../functions/DebugTools";
var debug : boolean = config.debug;

export class ChatUser {

    //variables
    ip: string //Client IP
    socket: WebSocket //Client endpoint for talking to the server
    id: string = uuidv4() //Unique UUIDv4 id
    _state: 0|1|2|3|4 = 0 // ["CONNECTED", "LOOKING", "PAIRED", "DISCONNECTED", "BANNED"]
    name: string = ""; // Client name
    pair : Pair | null; // Client pair
    joindate : string; //Date when the user joined

    //constants
    //States that a user can have
    static readonly CONNECTED = 0;
    static readonly LOOKING = 1;
    static readonly PAIRED = 2;
    static readonly DISCONNECTED = 3;
    static readonly BANNED = 4;

    //Commands that a user can run
    static readonly _search = 0;
    static readonly _disconnect = 1;
    static readonly _send = 2;
    static readonly _report = 3;
    static readonly _namechange = 4;


    //constructor
    constructor(ip: string, socket: WebSocket){
        this.ip = ip;
        this.socket = socket;
        this.pair = null;
	    this.joindate = Date.now().toString();

        //personal event handlers

        this.socket.onmessage = (message : MessageEvent) : void => {
            if(debug){
                log("debug", "Server has received: " + message.data);
                log("debug", "'this' in socket.onmessage is " + this.constructor.name);
            }
            try{
                var parsedMsg : Message = JSON.parse(message.data);
                
                if(parsedMsg.type === "command"){
                    //command parse
                    if(parsedMsg.body === ChatUser._search){
                        //user has requested to search for other users

                        if(debug) log("debug", "command parse > search request")
                        this.setState(ChatUser.LOOKING);
                    } else if(parsedMsg.body === ChatUser._disconnect){
                        //user has requested to disconnect
                        //user must be either PAIRED or LOOKING

                        if(this.state === ChatUser.PAIRED){
                            this.pair?.unpair();
                        } else if(this.state === ChatUser.LOOKING){
                            this.setState(ChatUser.DISCONNECTED);
                        }
                    } else if(parsedMsg.body === ChatUser._send) {
                        //user has requested to send a message
                        //user must be PAIRED

                        if(this.state === ChatUser.PAIRED){
                            this.pair?.send({
                                type: "message",
                                body: this.name,
                                message: parsedMsg.message
                            })
                        }
                    } else if(parsedMsg.body === ChatUser._report){
                        //user has requested to report the previous user
                        //user must be DISCONNECTED
                        if(this.state === ChatUser.DISCONNECTED){
                            if(this.pair){
                                var reportprep : Object = {
                                    reporter_id: this.id,
                                    reporter_ip: this.ip,
                                    reporter_name: this.name,
                                    rpairid: this.pair.id,
                                    info: {
                                        user1id: this.pair.user1.id,
                                        user1ip: this.pair.user1.ip,
                                        user1name: this.pair.user1.name,
                                        user2id: this.pair.user2.id,
                                        user2ip: this.pair.user2.ip,
                                        user2name: this.pair.user2.name
                                    }
                                }
                                fs.writeFileSync(config.reportDir + uuidv4() + ".json", JSON.stringify(reportprep));
                            }
                        }

                    } else if(parsedMsg.body === ChatUser._namechange){
                        //user has requested to change or get a new name
                        //user must be CONNECTED, PAIRED or DISCONNECTED

                        if(parsedMsg.message && parsedMsg.message.length <= 50){
                            if(this.name != parsedMsg.message){
                                if(this.state != ChatUser.BANNED && this.state != ChatUser.LOOKING){
                                    if(debug) log("debug", "Reached second condition of _namechange");
                                    if(this.state === ChatUser.PAIRED){
                                        this.pair?.send({
                                            type: "message",
                                            body: 0,
                                            message: this.name + " has changed names. Their name is now " + parsedMsg.message + "."
                                        })
                                    }
                                    this.name = parsedMsg.message;
                                }
                            } 
                        }
                    } else throw new Error();
                } else throw new Error();
    
            } catch(error) {
                //TODO: Chief, I don't know if this is the best way of checking for malformed commands. Look into this please.
                log("error/P1", "Malformed request from IP " + this.ip);
                log("error/P2", "Request was " + message.data);
                this.terminate();
            }
        }

        this.socket.onclose = () : void =>{
            this.terminate();
        }
    }

    async send(msg : Message){
        this.socket.send(JSON.stringify(msg));
    }

    system_message(msg : string){
        this.send({
            type: "message",
            body: 0,
            message: msg
        })
    }

    get state() : 0|1|2|3|4{
        return this._state;
    }

    set state(s: 0|1|2|3|4){
        var msg : Message = {
            type: "state",
            body: s
        };
        if(s === ChatUser.PAIRED){
            if(this.pair){
                if(this.id === this.pair.user1.id){
                    msg.message = this.pair.user2.name;
                } else {
                    msg.message = this.pair.user1.name;
                }
            }
        }
        if(this._state === ChatUser.PAIRED && s === ChatUser.DISCONNECTED){
            if(this.pair){
                msg.message = this.pair.id;
            }
        }
        this.send(msg);
        this._state = s;
    }

    setState(state: 0|1|2|3|4) : void{
        if(debug) log("debug", "'this' in setState is: " + this.constructor.name);
        switch(state){
            case ChatUser.LOOKING:
                this.pair = null;
                if(this.state == ChatUser.CONNECTED || this.state == ChatUser.DISCONNECTED){
                    this.state = ChatUser.LOOKING
                } else {
                    log("error", "IP " + this.ip + " has requested a dodgy state (1).");
                    this.socket.close(1003);
                }
                break;
            case ChatUser.PAIRED:
                if(this.state == ChatUser.LOOKING){
                    this.state = ChatUser.PAIRED;
                } else {
                    log("error", "IP " + this.ip + " has requested a dodgy state (2).");
                    this.socket.close(1003);
                }
                break;
            case ChatUser.DISCONNECTED:
                if(this.state == ChatUser.LOOKING || this.state == ChatUser.PAIRED){
                    this.state = ChatUser.DISCONNECTED;
                } else {
                    log("error", "IP " + this.ip + " has requested a dodgy state (3).");
                    this.socket.close(1003);
                }
                break;
            case ChatUser.BANNED:
                //TODO: add banned state
                break;
            default:
                log("error", "IP " + this.ip + " has requested a dodgy state (4).");
                this.socket.close(1003);
        }
    }

    getId() : string{
        return this.id;
    }

    terminate() : void{
        if(this.state === ChatUser.PAIRED){
           this.pair?.unpair()
           this.pair = null;
        }
        ChatServer.delUser(this);
    }

    /* 
    
    This piece of horrendous code has been saved as a lesson for future generations.

    //TODO: Jesus Christ, this is going to be a memory muncher.
    //Are you sure this is the best way of doing this?
    terminate() : void{
        if(debug) log("debug", "terminate() 'this' is " + this.constructor.name);
        if(this.constructor.name === "WebSocket"){
            //@ts-ignore
            if(this.readyState != ws.CLOSING && this.readyState != ws.CLOSED){
            //@ts-ignore
                this.close();
            }
            ChatServer.delUser(this.parent);
        }
    }*/
};
