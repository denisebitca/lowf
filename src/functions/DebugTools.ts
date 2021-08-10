import ws from "ws";
import { ChatServer } from "../classes/ChatServer";

import config from "../config.json";
var debug : boolean = config.debug;

// debug functions

export function log(type : string, message : string) : void{
    console.log("[" + new Date(Date.now()).toUTCString() + "] [" + type + "] " + message);
}

export function runTesting() : void{
    var client : ws = new ws("ws://localhost:3000");
    ws.once(client, "open").then(()=>{
        log("debug", "Client connection open! Testing messages...");
        client.onclose = ()=>{
            log("debug", "Client connection closed!")
        };
        client.onmessage = (event)=>{
            log("debug", "Client has received: " + event.data);
        }
        //client.send('{"json": true}');
        client.send('{"type":"command","body":0}');
    })
}

if(debug){
    setInterval(()=>{
        if(ChatServer.listUsers.length > 0){
            log("debug", "--------")
            log("debug", "START OF LIST OF USERS")
            ChatServer.listUsers.forEach((user)=>{
                log("debug", "------");
                log("debug", "User ID: " + user.id);
                log("debug", "User IP: " + user.ip);
                log("debug", "User name: " + user.name);
                log("debug", "User state: " + user.state);
                log("debug", "------");

            })
            log("debug", "END OF LIST OF USERS");
            log("debug", "--------");
        }
    }, 5000)
}

export default {log, runTesting};