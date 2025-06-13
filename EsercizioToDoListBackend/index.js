const express = require("express");

const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();

const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */ });

io.on("connection", (socket) => {
    console.log("[CONNESSIONE SOCKET]", socket.id);
});

class Db{

    static users = [];

    constructor(){}

    static addUser(name, psw, ruolo, privilegi){
        if(Db.findUser(name)){
            console.log("[AGGIUNTA UTENTE]", "Non è possibile aggiungere l'utente", name, "visto che è già registrato");
            return false;
        }
        Db.users.push(new User(name, psw, ruolo, privilegi));
        return true;
    }

    static login(name, psw){
        for(const user of Db.users){
            if(user.username == name && user.password == psw){
                return true;
            }
        }
        return false;
    }

    static findUser(username){
        for(const user of Db.users){
            if(user.username == username) return true;
        }
        return false;
    }

    static print(){
        for(const user of Db.users){
            console.log(user);
        }
    }

}

const ADMIN = 999;
const NORMAL = 1;
class User{

    static toDoList = new Map();
    static categorie = new Map(); //categorie rispettive
    
    constructor(name, psw, ruolo, livello){
        this.username = name;
        this.password = psw;
        this.ruolo = ruolo;
        this.privilegi = livello;
    }

    add(element, categoria){
        User.toDoList.get(this.ruolo).push(element);
        User.categorie.get(this.ruolo).push(categoria);
    }

    delete(element, categoria){
        const todos = User.toDoList.get(this.ruolo);
        const categorie = User.categorie.get(this.ruolo);
        for(let i=0; i<todos.length; i++){
            if(todos[i] === element && categorie[i] === categoria){
                todos.splice(i, 1);
                categorie.splice(i, 1);
                break;
            }
        }
    }
}

function getOnlineTodos() {
    return fetch('https://jsonplaceholder.typicode.com/todos')
        .then(response => response.json())
        .then(data => {
            const titles = [];
            for(let todo of data){
                titles.push(todo.title);
            }
            return titles;
        })
        .catch((error) => {
            console.error('Error:', error);
            return [];
        });
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

app.use(express.static("./client"));

app.use(express.urlencoded({extent:false})); //è sbagliato, ho scritto come nelle slide, ma dovrebbe essere extended. Ma visto che false è di default funziona cmq
app.use(express.json());

app.post("/login", (req, res) => {
    const {username} = req.body;
    const {password} = req.body;
    const {socketId} = req.body;

    console.log("[TENTATIVO ACCESSO]", "user:", username, ";", "password:", password);
    const success = Db.login(username, password);
    console.log("[RISULTATO]", success);
    Db.print();
    if(success){
        const user = Db.users.find(u => u.username === username && u.password === password);
        const ruolo = user.ruolo;
        const socket = io.sockets.sockets.get(socketId); 
        if (socket) socket.join("room-"+ruolo);
        return res.status(200).json({ success: true, toDoList: User.toDoList.get(ruolo), categorie: User.categorie.get(ruolo), ruolo: ruolo });
    } else {
        return res.status(401).json({ success: false});
    }
        
});

app.post("/registrazione", (req, res) => {
    const {username} = req.body;
    const {password} = req.body;
    const { ruolo } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Tutti i campi sono obbligatori" });
    }

    console.log("[TENTATIVO REGISTRAZIONE]", "user:", username, ";", "password:", password);
    const success = Db.addUser(username, password, ruolo, NORMAL);
    
    console.log("[RISULTATO]", success);
    Db.print();
    if(success){
        return res.status(200).json({ success: true  });
    }else {
        return res.status(401).json({ success: false, message: "Utente già registrato" });
    }
    
});

app.post("/addElement", (req, res) => {
    const { todo } = req.body;
    const { categoria } = req.body;
    const {socketId} = req.body;
    const {username, password} = req.body;

    const user = Db.users.find(u => u.username === username && u.password === password);
    if (user) {
        user.add(todo, categoria);
        io.to("room-"+user.ruolo).emit('updateList', {todo, categoria, fromSocketId: socketId, type: "add"});
        return res.status(200).json({ success: true});
    } else {
        return res.status(401).json({ success: false, message: "Credenziali errate" });
    }
});

app.post("/deleteElement", (req, res) => {
    const { todo } = req.body;
    const { categoria } = req.body;
    const {username, password} = req.body;
    const {socketId} = req.body;

    const user = Db.users.find(u => u.username === username && u.password === password);
    if(user){

        if(user.privilegi === ADMIN){
            user.delete(todo, categoria);
            io.to("room-"+user.ruolo).emit('updateList', {todo, categoria, fromSocketId: socketId, type: "del"});
            return res.status(200).json({ success: true});
        } else {
            return res.status(403).json({ success: false, message: "Permessi non sufficienti" });
        }

    } else {
        return res.status(401).json({ success: false, message: "Credenziali errate" });
    }

});

let jsonplaceholderTodos = [];

getOnlineTodos().then(titles => {
    jsonplaceholderTodos = titles;

    new Db();
    User.toDoList.set("Sviluppatore", []);
    User.toDoList.set("Designer", []);
    User.toDoList.set("Tester", []);
    User.categorie.set("Sviluppatore", []);
    User.categorie.set("Designer", []);
    User.categorie.set("Tester", []);

    //aggiungiamo gli utenti admin per ogni categoria
    Db.addUser("adminS", "1234", "Sviluppatore", ADMIN);
    Db.addUser("adminD", "1234", "Designer", ADMIN);
    Db.addUser("adminT", "1234", "Tester", ADMIN);

    const admins = ["adminS", "adminD", "adminT"];
    for(let admin of admins){
        const user = Db.users.find(u => u.username === admin);
        const rand = randomInt(0, jsonplaceholderTodos.length-1);
        const todo = jsonplaceholderTodos[rand];
        jsonplaceholderTodos.splice(rand, 1);
        user.add(todo, "imp");
    }

    httpServer.listen(8080, () => {
        console.log("Server listen on port 8080");
    });

});