/* 
lowf 3.0
*/

//general variables

const CONNECTED = 0;
const LOOKING = 1;
const PAIRED = 2;
const DISCONNECTED = 3;
const BANNED = 4;

var currentState = CONNECTED;
var myName;
var set;

//pairing
var partnerName;
var sent = false;

//disconnect
var disconnectInitiated = false;

//service worker


if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js')
        .then(reg => {
        console.log('Service worker registered!', reg);
        })
        .catch(err => {
        console.log('Service worker registration failed: ', err);
        });
    });
}


//focus detector

document.addEventListener("visibilitychange", isVisible, false);

function isVisible(){
    if(document.hidden){
        return false
    } else {
        return true
    }
}

//audio

var audio;
var disconnect;
var system;

var aObj;
var dObj;
var sObj;

// report button

var report = false;

//cookies
function getCookie(c_name) {
    var c_value = " " + document.cookie;
    var c_start = c_value.indexOf(" " + c_name + "=");
    if (c_start == -1) {
        c_value = null;
    }
    else {
        c_start = c_value.indexOf("=", c_start) + 1;
        var c_end = c_value.indexOf(";", c_start);
        if (c_end == -1) {
            c_end = c_value.length;
        }
        c_value = unescape(c_value.substring(c_start,c_end));
    }
    return c_value;
}

function setCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

//run on start
darkmode(true)

function displayImportantMessage(msg){
    document.querySelectorAll(".lds-css")[0].remove();
    $("#overlay>span").text(msg);
    $("#overlay").show();
}

window.onload = ()=>{
    if(window.Worker && window.WebSocket && window.Notification){
        document.querySelector("#button_connect").addEventListener("click", ()=>{
            if($("#namebox").val().length >= 1 && $("#namebox").val().length <= 50){
                window.ws.postMessage({body: 4, message: document.querySelector("#namebox").value});
                myName = document.querySelector("#namebox").value;
                $("#namebox-settings").val(myName);
                window.ws.postMessage(0);
                if(getCookie("sound")){
                    if(getCookie("sound") === "on"){
                        aObj = new Audio('./sounds/notification.mp3');
                        dObj = new Audio('./sounds/disconnect.mp3')
                        sObj = new Audio('./sounds/system.mp3')
                        audio = {"play":function(){if(!isVisible()) aObj.play()}}
                        disconnect = {"play":function(){if(!isVisible()) dObj.play()}}
                        system = {"play":function(){if(!isVisible()) sObj.play()}}
                        
                        $("#sound").prop("checked", "true")
                    } else {
                        audio = {"play":function(){}}
                        disconnect = {"play":function(){}}
                        system = {"play":function(){}}
                    }
                } else {
                    aObj = new Audio('./sounds/notification.mp3');
                    dObj = new Audio('./sounds/disconnect.mp3')
                    sObj = new Audio('./sounds/system.mp3')
                    audio = {"play":function(){if(!isVisible()) aObj.play()}}
                    disconnect = {"play":function(){if(!isVisible()) dObj.play()}}
                    system = {"play":function(){if(!isVisible()) sObj.play()}}
                    setCookie("sound", "on", 60)
                    $("#sound").prop("checked", "true")
                }
            } else {
                $.notify("Invalid name!")
            }
        });
        window.ws = new Worker("worker.js");
        window.ws.onmessage = function(e){
            var msg = "";
            try{
                msg = JSON.parse(e.data);
            } catch(error) {
                if(e.data === "disconnect"){
                    displayImportantMessage("A connection could not be made to the Lowf chatting server. Please refresh, check your Internet connection and check that you don't have a tab with Lowf already open.")
                    
                } else if (e.data === "maintenance"){
                    displayImportantMessage("Lowf is currently under maintenance. We apologise for the inconvenience.")

                } else if (e.data === "open"){
                    $("#overlay").hide();
                }
            }
            if(typeof(msg) === "object"){
                if(msg.type === "state"){
                    switch(msg.body){
                        case LOOKING:
                            report = false;
                            //Main DOM changes
                            $("#return>.back").text("exit_to_app");
                            if(currentState === CONNECTED){
                                $("#mainpage").hide();
                                $("#chat").show();
                            }
                            chat_clear();
                            chat_entry("system", "Looking for someone to chat with...");
    
                            $("#textbox").attr("disabled", "");
                            $("#namebox-settings").attr("disabled");
                            currentState = LOOKING;
                            break;
                        case PAIRED:
                            $("#return>.back").text("exit_to_app");
                            chat_clear();
                            audio.play();
                            chat_entry("system", "This is a conversation between you, " + myName + ", and " + msg.message + ".");
                            partnerName = msg.message;

                            $("#textbox").removeAttr("disabled");
                            $("#namebox-settings").removeAttr("disabled");
    
                            currentState = PAIRED;
                            break;
                        case DISCONNECTED:
                            $("#return>.back").text("done");
                            if(disconnectInitiated){
                                var s = "You have ";
                                disconnectInitiated = false;
                            } else {
                                disconnect.play();
                                var s = partnerName + " has "
                            }

                            $("#textbox").attr("disabled", "");

                            chat_entry("system", " ");
                            chat_entry("system", s + "disconnected.", "");
                            chat_entry("system", " ");
                            if(msg.message){
                                chat_entry("system", "Your conversation has been saved at https://lowf.codes/logs/"+msg.message+".txt. Conversations are kept for one day.")
                                //render report
                                var t = $("<div></div>");
                                /*
                                <div class="button" id="button_report">
                                    <span>Change name</span>
                                </div>
                                */
                                var b = $("<div></div>");
                                var b2 = $("<span></span>");
                                b2.text("Report user");
                                b.append(b2);
                                b.attr("class", "button");
                                b.attr("id", "button_report");
                                if(getCookie("darkmode") === "true"){
                                    b.attr("data-theme", "darkmode");
                                    b2.attr("data-theme", "darkmode");
                                }
                                b.on("click", (event)=>{
                                    if(currentState === DISCONNECTED && report === false){
                                        window.ws.postMessage(3);
                                        report = true;
                                        $("#button_report").remove();
                                        $.notify("User reported!");
                                    }
                                })
                                t.append(b);
                                $("#messagecontainer").append(t);
                            }
                            currentState = DISCONNECTED;
                            break;
                        case BANNED:
                            displayImportantMessage("You have been banned. To appeal your ban, send an email to lowfchat@gmail.com with your IP address and why you should be unbanned.");
                            break;
                    }
                } else if (msg.type === "message"){
                    if(msg.body === 0){
                            system.play();
                            chat_entry("system", msg.message, "System message: ")
                    } else {
                        if(msg.body === myName && sent){
                            chat_entry("receiver", msg.message, msg.body);
                            sent = false;
                        } else {
                            audio.play();
                            chat_entry("sender", msg.message, msg.body);
                        }
                    } 
                }
            }
        }
    } else {
        displayImportantMessage("Your browser does not support Lowf. We're sorry for the inconvenience.")
    }
}




//text rendering

function chat_entry(type, message, sender){
    var span1;
    var span2;
    /*var msg = $("<div></div>")
    span1 = $("<span></span>")
    span2 = $("<span></span>")
    msg.attr("class", "message " + type)
    type === "system" ? $(span1).text(message) : span1.text(sender + ": ")
    type === "system" ? null : $(span2).text(message)
    msg.append(span1)
    type === "system" ? null : msg.append(span2)
    $("#messagecontainer").append(msg)*/

    var msg = document.createElement("div");
    var span1 = document.createElement("span");
    var span2 = document.createElement("span");
    msg.setAttribute("class", "message " + type);
    if(type === "system"){
        span1.textContent = message;
    } else {
        span1.textContent = sender + ": ";
        span2.textContent = message;
    }
    msg.append(span1);
    type === "system" ? null : msg.append(span2);
    document.querySelector("#messagecontainer").append(msg);
    
}

function chat_clear(){
    while ($("#messagecontainer>div:nth-child(1)")[0]) {
        $("#messagecontainer").find('div:first').remove();
    }
}


// misc

function submitOnEnter(event){
    if(event.which === 13){
        if(currentState === PAIRED){
            if($("#textbox").val() != ""){
                send(2, $("#textbox").val());
                $("#textbox").val("")
                event.preventDefault();
            } else {
                event.preventDefault();
            }
        } else {
            event.preventDefault();
        }
    }
}


function dcOrRc(){
    if(currentState === DISCONNECTED || currentState === CONNECTED){
        window.ws.postMessage(0)
    } else {
        window.ws.postMessage(1)
        disconnectInitiated = true;
    }
}

function send(body, msg){
    if(currentState === PAIRED){
        var message = {
            body: body,
            message: msg
        };
        window.ws.postMessage(message);
        sent = true;
    }
}

//PAIRED event handlers
document.getElementById("textbox").addEventListener("keypress", submitOnEnter);
document.getElementById("button").addEventListener("click", ()=>{
    if($("#textbox").val() != ""){
        send(2, $("#textbox").val());
        $("#textbox").val("");
    }
})
document.getElementById("button_changename").addEventListener("click", ()=>{
    if(currentState != LOOKING && currentState != CONNECTED){
        if($("#namebox-settings").val().length <= 50 && $("#namebox-settings").val().length >= 1){
            window.ws.postMessage({
                body: 4,
                message: $("#namebox-settings").val()
            });
            myName = $("#namebox-settings").val();
        } else {
            $.notify("Invalid name!")
        }
    }
})
document.getElementById("return").addEventListener("click", dcOrRc);


//MISC 2

$("#sound").on("click", function(){
    if($("#sound").prop("checked")){
        setCookie("sound","on", 60)
        if(currentState != CONNECTED){
            aObj = new Audio('./sounds/notification.mp3');
            dObj = new Audio('./sounds/disconnect.mp3')
            sObj = new Audio('./sounds/system.mp3')
            audio = {"play":function(){if(!isVisible()) aObj.play()}}
            disconnect = {"play":function(){if(!isVisible()) dObj.play()}}
            system = {"play":function(){if(!isVisible()) sObj.play()}}
        }
    } else {
        setCookie("sound","off", 60)
        if(currentState != CONNECTED){
            audio = {"play":function(){}}
            disconnect = {"play":function(){}}
            system = {"play":function(){}}
        }
    }
})

$(".settings").on("click", function(){
    if(set){
        set = false
        const element = document.querySelector('#settingsmenu')
        element.classList.remove('slideInRight')
        element.classList.add('animated', 'slideOutRight')
    } else {
        set = true
        $("#settingsmenu").attr('style','display: flex')
        const element = document.querySelector('#settingsmenu')
        element.classList.remove('slideOutRight')
        element.classList.add('animated', 'slideInRight')
    }
})

$("#darkmode").on("click", function(){
    darkmode()
})

if(getCookie("sound") === "off"){
    $("#sound").prop("checked", "")
}

//TODO: AAAAAAAAAAAA THIS IS HORRIBLE :sob:

function darkmode(check){
    if(getCookie("darkmode") && !check){
        if(getCookie("darkmode") === "false"){
            setCookie("darkmode", "true", 60)
            $("span").attr('data-theme','darkmode')
            document.querySelector("#overlay").setAttribute("data-theme", "darkmode")
            $("body").attr('data-theme','darkmode')
            $("html").attr('data-theme','darkmode')
            $("h2").attr('data-theme','darkmode')
            $("i").attr('data-theme','darkmode')
            $("#navbar").attr('data-theme','darkmode')
            $(".settings").attr('data-theme','darkmode')
            $(".back").attr('data-theme','darkmode')
            $("#settingsmenu").attr('data-theme','darkmode')
            $(".button").attr('data-theme','darkmode')
            $("#button").attr('data-theme','darkmode')
            $(".send").attr('data-theme','darkmode')
            $("#button_report").attr('data-theme', 'darkmode')
            $("#sendbox").attr('data-theme','darkmode')
            $("#messagecontainer").attr('data-theme','darkmode')
            $("#textbox").attr('data-theme','darkmode')
        } else if(getCookie("darkmode") === "true"){
            setCookie("darkmode", "false", 60)
            $("span").attr('data-theme','')
            document.querySelector("#overlay").setAttribute("data-theme", "")
            $("#button_report").attr('data-theme', '')
            $("body").attr('data-theme','')
            $("html").attr('data-theme','')
            $("h2").attr('data-theme','')
            $("i").attr('data-theme','')
            $("#navbar").attr('data-theme','')
            $(".settings").attr('data-theme','')
            $(".back").attr('data-theme','')
            $("#settingsmenu").attr('data-theme','')
            $(".button").attr('data-theme','')
            $("#button").attr('data-theme','')
            $(".send").attr('data-theme','')
            $("#sendbox").attr('data-theme','')
            $("#messagecontainer").attr('data-theme','')
            $("#textbox").attr('data-theme','')
        }
    } else if(check){
        if(getCookie("darkmode") === "true"){
            $("#darkmode").prop("checked", "true")
            $("span").attr('data-theme','darkmode')
            document.querySelector("#overlay").setAttribute("data-theme", "darkmode")
            $("body").attr('data-theme','darkmode')
            $("html").attr('data-theme','darkmode')
            $("h2").attr('data-theme','darkmode')
            $("i").attr('data-theme','darkmode')
            $("#navbar").attr('data-theme','darkmode')
            $(".settings").attr('data-theme','darkmode')
            $(".back").attr('data-theme','darkmode')
            $("#settingsmenu").attr('data-theme','darkmode')
            $(".button").attr('data-theme','darkmode')
            $("#button").attr('data-theme','darkmode')
            $(".send").attr('data-theme','darkmode')
            $("#sendbox").attr('data-theme','darkmode')
            $("#messagecontainer").attr('data-theme','darkmode')
            $("#textbox").attr('data-theme','darkmode')
        } else if(getCookie("darkmode") === "false"){
            $("#darkmode").prop("checked", "")
            $("span").attr('data-theme','')
            document.querySelector("#overlay").setAttribute("data-theme", "")
            $("body").attr('data-theme','')
            $("html").attr('data-theme','')
            $("h2").attr('data-theme','')
            $("i").attr('data-theme','')
            $("#navbar").attr('data-theme','')
            $(".settings").attr('data-theme','')
            $(".back").attr('data-theme','')
            $("#settingsmenu").attr('data-theme','')
            $(".button").attr('data-theme','')
            $("#button").attr('data-theme','')
            $(".send").attr('data-theme','')
            $("#sendbox").attr('data-theme','')
            $("#messagecontainer").attr('data-theme','')
            $("#textbox").attr('data-theme','')
        }
    } else if(!check){
        setCookie("darkmode", "true", 60)
        $("span").attr('data-theme','darkmode')
        document.querySelector("#overlay").setAttribute("data-theme", "darkmode")
        $("body").attr('data-theme','darkmode')
        $("html").attr('data-theme','darkmode')
        $("h2").attr('data-theme','darkmode')
        $("i").attr('data-theme','darkmode')
        $("#navbar").attr('data-theme','darkmode')
        $(".settings").attr('data-theme','darkmode')
        $(".back").attr('data-theme','darkmode')
        $("#settingsmenu").attr('data-theme','darkmode')
        $(".button").attr('data-theme','darkmode')
        $("#button").attr('data-theme','darkmode')
        $(".send").attr('data-theme','darkmode')
        $("#sendbox").attr('data-theme','darkmode')
        $("#messagecontainer").attr('data-theme','darkmode')
        $("#textbox").attr('data-theme','darkmode')
    }
}
