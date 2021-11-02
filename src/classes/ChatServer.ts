'use strict';
import express from "express";
import http from "node:http";
import ws from "ws";
import random from "random";

import { ChatUser } from "./ChatUser";
import { Pair } from "./Pair";
import config from "../config.json";

import { log /*, runTesting*/ } from "../functions/DebugTools";
var debug : boolean = config.debug;

//SSL unneeded - i am running this through a reverse proxy

export class ChatServer {

    //variables
    static app : express.Application;
    static server : http.Server;
    static wss : ws.Server;
    static listUsers : Array<ChatUser> = new Array;

    //constructor
    constructor(port : number){

        //Setting up the server
        ChatServer.app = express();

        //Setting up Express routes
        ChatServer.app.use('/', express.static(config.websiteDir));

        if(debug){
            ChatServer.server = ChatServer.app.listen(port, ()=>{
                console.log("LOWF Backend has started.");
            });
        } else {
            ChatServer.server = http.createServer(ChatServer.app);
            ChatServer.server.listen(port, ()=>{
                console.log("LOWF Backend has started.");
            });
        }
        ChatServer.wss = new ws.Server({ server: ChatServer.server }); //TODO: add KB limit for messages

        //Setting up Websocket event handlers
        //if(debug) ChatServer.wss.on("listening", runTesting);
        ChatServer.wss.on("connection", ChatServer.newUser);

        //Setting up interval that pairs users together
        setInterval(()=>{
            //if(debug) log("debug", ChatServer.listUsers.length.toString())
            if(ChatServer.listUsers.length > 1){
                //if(debug) log("debug", "Reached ChatServer.listUsers.length > 1");
                ChatServer.listUsers.forEach((user)=>{
                    if(user.state === ChatUser.LOOKING) {
                        var id = user.id;
                        var searching : ChatUser[] = ChatServer.listUsers.filter((user)=>{
                            return user.state === ChatUser.LOOKING && user.id != id;
                        });
                        if(searching.length != 0){
                            var randomUser = searching[random.int(0, searching.length-1)];
                            if(debug) log("debug", "randomUser.id = " + randomUser.id);
                            new Pair(user, randomUser);
                        }
                    }
                })
            }
        }, 1000);

    }
    
    //methods
    
    static newUser(ws : WebSocket, req : http.IncomingMessage) : void {
        if(debug) log("debug", "newUser fired!");
        var ip : string | undefined;
        ip = req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress;
        if(debug) log("debug", "IP: " + ip);
        if(ip === undefined){
            log("error", "Undefined IP!")
            ws.close(1003);
        } else if(!debug && ChatServer.listUsers.find((user)=>{
            return user.ip === ip;
        })){
            log("error", "IP " + ip + " has tried to connect twice.")
            ws.close(1003);
        } else {
            ChatServer.listUsers.push(new ChatUser(ip, ws));
        }
    };

    static delUser(cs : ChatUser) : void{
        ChatServer.listUsers = ChatServer.listUsers.filter(user => user != cs);
    }

    static broadcast(msg : string) : void{
        ChatServer.listUsers.forEach((user)=>{
            user.system_message(msg);
        });
    }

    static dm(id:string, msg:string) : void{
        ChatServer.listUsers.find((user)=>{
            return user.id === id
        })?.system_message("Personal system message: " + msg);
    }
};
