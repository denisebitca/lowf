import { Message } from "./Message";
import { ChatUser } from "./ChatUser";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

export class Pair{
    user1: ChatUser;
    user2: ChatUser;
    id: string = uuidv4();
    active: boolean = true;
    lfile: any;
    constructor(u1 : ChatUser, u2 : ChatUser){
        this.user1 = u1;
        this.user2 = u2;

        //Assign pair to users
        this.user1.pair = this;
        this.user2.pair = this;

        this.user1.setState(ChatUser.PAIRED);
        this.user2.setState(ChatUser.PAIRED);

        //Start logging
        this.lfile = fs.writeFileSync(__dirname + '/../public/logs/' + this.id + ".txt", "lowf.codes conversation\n\nThis is a conversation between " + this.user1.name + ' and ' + this.user2.name + '.\n\n');
    }
    unpair() : void {
        if(this.active){
            this.user1.setState(ChatUser.DISCONNECTED);
            this.user2.setState(ChatUser.DISCONNECTED);
            this.active = false;
        }
    }
    send(msg : Message) : void {
        if(typeof(msg.body) === "string"){
            fs.appendFileSync(__dirname + '/../public/logs/' + this.id + ".txt", msg.body + ": " + msg.message + '\n');
        } else {
            fs.appendFileSync(__dirname + '/../public/logs/' + this.id + ".txt", msg.message + '\n');
        }
        this.user1.send(msg);
        this.user2.send(msg);
    } 

};
