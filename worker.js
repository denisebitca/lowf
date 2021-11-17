var host = "wss://"+location.hostname.replace("www.","");
var ws = new WebSocket(host);
var msg;
ws.onmessage = msgParser;
ws.onclose = msgParser;
ws.onopen = open;

onmessage = (e)=>{
    if(typeof(e.data) == "number"){
        switch(e.data){ // ["search", "disconnect", "report", "changename"]
            case 0: //search
            case 1: //disconnect
            case 3: //report
                send("command", e.data);
                break;
        }
    } else {
        switch(e.data.body){
            case 2: //send-message
            case 4: //changename
                send("command", e.data.body, e.data.message)
                break;
        }
    }
}

function send(type, body, message){
    if(ws){
        msg = {
            type: type,
            body: body
        }
        if(message != undefined){
            msg.message = message;
        }
        ws.send(JSON.stringify(msg))
    }
}

function msgParser(e){
    if(e.data){
        postMessage(e.data);
        if(e.data === "maintenance"){
            ws.close();
            ws = null;
        }
    } else {
        console.log(e.code);
        if(e.code != 1000 && e.code != 1001){
            ws = null;
            postMessage("disconnect")
        }
    }
}

function open(){
    postMessage("open")
}
