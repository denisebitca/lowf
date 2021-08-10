'use strict';
import { ChatServer } from "./classes/ChatServer";
import { log } from "./functions/DebugTools";
import config from "./config.json";

var debug : boolean = config.debug;

new ChatServer(config.port);

if(!debug){
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
                log("debug", "User join date: " + user.joindate);
		if(user.pair){
                    log("debug", "User pair ID: " + user.pair.id);
                }
                log("debug", "------");

            })
            log("debug", "END OF LIST OF USERS");
            log("debug", "--------");
        }
    }, 5000)
}
