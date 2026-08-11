import manifest from "./manifest.json";
import { CardSprite } from "./sprites/CardSprite"
import { Card, type Suit, Suits } from  "./models/Card"
import { Peer } from 'peerjs';
import { Application, Assets, TexturePool, TextureStyle, Ticker } from 'pixi.js';
import { Table } from "./Table";

const myidElem: HTMLElement = document.getElementById("myid")!;
const appContainerElem: HTMLElement = document.getElementById("appContainer")!;

const peeridInput: HTMLInputElement = document.getElementById("peerid") as HTMLInputElement;
const connectButton: HTMLElement = document.getElementById("connect")!;

(async () => {
    const app = new Application();
    await app.init({
        antialias: false,
        roundPixels: true,
        background: '#EAFFEA',
        width: 800,
        height: 600,
        sharedTicker: true
    })
    TextureStyle.defaultOptions.scaleMode = 'nearest';
    TexturePool.textureOptions.scaleMode = 'nearest';
    await Assets.init({manifest: manifest, basePath: 'assets'});
    await Assets.loadBundle('card');
    
    appContainerElem.appendChild(app.canvas);

    const card0 = new CardSprite("card0", new Card(Suits.Spades, 1));
    const card1 = new CardSprite("card1", new Card(Suits.Diamonds, 2));
    const card2 = new CardSprite("card2", new Card(Suits.Clubs, 12));
    const card3 = new CardSprite("card3", new Card(Suits.Hearts, 13));

    app.stage.addChild(card0);
    app.stage.addChild(card1);
    app.stage.addChild(card2);
    app.stage.addChild(card3);

    Ticker.shared.minFPS = 60;

    const table = await Table.createTable();

    myidElem.innerText = table.tableId ?? "";

    table.addEntity(card0);
    table.addEntity(card1);
    table.addEntity(card2);
    table.addEntity(card3);

    connectButton.addEventListener("click", function (event) {
        if (table.tableId && peeridInput.value) {
            table.connectToPeerTable(peeridInput.value);
        }
    });

    setInterval(() => {
        console.log(Array.from(table.players.keys()));
    }, 2000)
})();

// var myNumber;

// peer.on("open", function (id) {
//     console.log("My peer ID is: " + id);
//     myidElem.innerText = id;
// });

// peer.on("connection", function(conn) {
//     conn.on("data", function(data) {
//         console.log("conn open callback from connectee");
//         if (!isNaN(data)) {
//             peerNumberElem.innerText = data;
//         }
//         if (myNumber === undefined) {
//             myNumber = Math.floor(Math.random() * 10);
//             myNumberElem.innerText = myNumber;
//             conn.send(myNumber);
//         }
//     })
// })

// connectButton.addEventListener("click", function (event) {
//     if (!peer.disconnected && peeridInput.value) {
//         console.log("hello")
//         const conn = peer.connect(peeridInput.value);
//         conn.on("open", function() {
//             console.log("conn open callback from connector");
//             conn.on("data", function(data) {
//                 if (!isNaN(data)) {
//                     peerNumberElem.innerText = data;
//                 }
//             });

//             myNumber = Math.floor(Math.random() * 10);
//             myNumberElem.innerText = myNumber;
//             conn.send(myNumber);
//         });
//     }
// });


