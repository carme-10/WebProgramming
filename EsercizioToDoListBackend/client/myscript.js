const socket = io();
socket.on('connect', () => {
    console.log('Connesso con id:', socket.id);
});

const listaGrafica = {
    $inputElement: null,
    $buttonElement: null,
    $listElements: null,
    $select: null,
    $filterCategories: null,
    init: function () {
        this.$inputElement = document.querySelector(".container-principale>.input-container>input");
        this.$buttonElement = document.querySelector(".container-principale>.input-container>button");
        this.$listElements = document.querySelector(".container-principale>.list-elements");
        this.$select = document.querySelector(".container-principale>.input-container>select");
        this.$filterCategories = document.querySelectorAll(".container-principale>.list-filter>div");

        this.$buttonElement.addEventListener("click", () => {
            this.addElement(username, password);
        });

        for (const iterato of this.$filterCategories) {
            iterato.addEventListener("click", () => {
                this._filter(iterato);
            });
        }

    },

    addElementLocally: function(todo, categoria){
        this.$listElements.appendChild(this._createElement(todo, categoria));        
    },

    deleteElementLocally: function(todo, categoria){
        let elements = this.$listElements.querySelectorAll(".list-element");
        for (let elem of elements){
            const text = elem.querySelector(".text").textContent;
            const categ = elem.getAttribute("data-categoria");
            if(todo === text && categoria === categ){
                elem.remove();
                break;
            }
        }
    },

    addElement: function (username, password) {
        const todo = this.$inputElement.value;
        const categoria = this.$select.value;
        fetch('/addElement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ todo, categoria, socketId: socket.id, username: username, password: password })
        }).then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.$inputElement.value = "";
                    this.$listElements.appendChild(this._createElement(todo, categoria));
                } else {
                    alert("Riprovare, c'è stato un errore");
                }
            })
            .catch((error) => {
                console.error('Error:', error);
            });

    },

    _filter: function (buttoneCliccato) {

        for (const iterato of this.$filterCategories) {
            iterato.classList.remove("active");
        }
        buttoneCliccato.classList.add("active");

        if (buttoneCliccato.getAttribute("data-categoria") == "") {
            //all
            for (const elem of this.$listElements.children) {

                elem.classList.remove("hidden");
            }

        } else {
            const cat = buttoneCliccato.getAttribute("data-categoria");
            for (const elem of this.$listElements.children) {
                if (elem.getAttribute("data-categoria") != cat) {
                    elem.classList.add("hidden");
                } else elem.classList.remove("hidden");
            }
        }



    },

    _createElement: function (msg, categoria) {
        const template = `
                <div class="list-element" data-categoria="${categoria}">
                    <div class="icon">#</div>
                    <div class="text">${msg}</div>
                    <div class="btn-delete">X</div>
                </div>
                `
        const elementoAux = document.createElement("div");

        elementoAux.innerHTML = template;
        const newElement = elementoAux.children[0];
        newElement.querySelector(".btn-delete").addEventListener("click", () => {
            const text = newElement.querySelector(".text").textContent;
            const categoria = newElement.getAttribute("data-categoria");
            
            fetch('/deleteElement', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ todo: text, categoria, socketId: socket.id, username: username, password: password })
            }).then(response => response.json())
                .then(data => {
                    if (data.success) {
                        newElement.remove();
                    } else {
                        alert(data.message);
                    }
                })
                .catch((error) => {
                    console.error('Error:', error);
                });
                
        });

        return newElement;
    }


};

listaGrafica.init();

socket.on('updateList', function(data){
    const todo = data.todo;
    const categoria = data.categoria;
    const fromSocketId = data.fromSocketId;
    const type = data.type;

    if(fromSocketId != socket.id){
        if(type == "add"){
            listaGrafica.addElementLocally(todo, categoria);
        } else if (type == "del"){
            listaGrafica.deleteElementLocally(todo, categoria);
        }
        
    }
    
});

let username, password;

function login(username, password) {
    fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, socketId: socket.id })
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                const toDoList = data.toDoList;
                const categorie = data.categorie;
                document.querySelector('.login').style.display = 'none';
                document.querySelector('.container-principale').style.display = 'flex';
                document.querySelector('.my-role').textContent = data.ruolo;
                document.querySelector('.my-username').textContent = username;
                for (let i = 0; i < toDoList.length; i++) {
                    listaGrafica.addElementLocally(toDoList[i], categorie[i]);
                }
            } else {
                alert('Credenziali non valide');
            }
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

const accediBtn = document.getElementById("sign-in");
accediBtn.addEventListener("click", () =>{

    username = document.getElementById("username").value;
    password = document.getElementById("psw").value;

    login(username, password);
});

const registratiBtn = document.getElementById("sign-up");
registratiBtn.addEventListener("click", () =>{

    username = document.getElementById("username").value;
    password = document.getElementById("psw").value;
    document.querySelector('.login').style.display = 'none';
    document.querySelector('.scelta-ruolo').style.display = "block";

});

const sceltaRuoloBtn = document.getElementById("scelta-ruolo");
sceltaRuoloBtn.addEventListener("click", () => {

    const ruolo = document.getElementById("ruolo").value;

    fetch('/registrazione', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, ruolo })
    }).then(response => response.json())
        .then(data => {
            if (data.success) {
                document.querySelector('.scelta-ruolo').style.display = "none";
                login(username, password);
            } else {
                alert(data.message);
            }
        })
        .catch((error) => {
            console.error('Error:', error);
        });
});