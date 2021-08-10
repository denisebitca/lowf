// types, interfaces and checkers

export type Message = {
    type: "command"|"state"|"message";
    body: 0|1|2|3|4|string; //["search", "disconnect", "send", "report", "namechange"]
    message?: string;
};