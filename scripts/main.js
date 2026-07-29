import { Peer } from 'peerjs'

const myidElem = document.getElementById("myid");
const peeridInput = document.getElementById("peerid");
const connectButton = document.getElementById("connect");
const myNumberElem = document.getElementById("mynumber");
const peerNumberElem = document.getElementById("peernumber");


const peer = new Peer({
    host: "cards-api.jeffreyshi.com",
    path: "/card-peer",
    secure: true
});

var myNumber;

peer.on("open", function (id) {
    console.log("My peer ID is: " + id);
    myidElem.innerText = id;
});

peer.on("connection", function(conn) {
    conn.on("data", function(data) {
        console.log("conn open callback from connectee");
        if (!isNaN(data)) {
            peerNumberElem.innerText = data;
        }
        if (myNumber === undefined) {
            myNumber = Math.floor(Math.random() * 10);
            myNumberElem.innerText = myNumber;
            conn.send(myNumber);
        }
    })
})

connectButton.addEventListener("click", function (event) {
    if (!peer.disconnected && peeridInput.value) {
        console.log("hello")
        const conn = peer.connect(peeridInput.value);
        conn.on("open", function() {
            console.log("conn open callback from connector");
            conn.on("data", function(data) {
                if (!isNaN(data)) {
                    peerNumberElem.innerText = data;
                }
            });

            myNumber = Math.floor(Math.random() * 10);
            myNumberElem.innerText = myNumber;
            conn.send(myNumber);
        });
    }
});


