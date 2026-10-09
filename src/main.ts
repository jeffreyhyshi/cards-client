import manifest from "./manifest.json";
import { Application, Assets, TexturePool, TextureStyle, Ticker } from 'pixi.js';
import { TableShell } from "./TableShell";
import { recursiveResize } from "./util/Utilities";
import { CardSprite } from "./sprites/CardSprite";
import { Card, Suits } from "./models/Card";
import { Filters } from "./util/Filters";
import { TableEngine } from "./TableEngine";

const appContainerElem: HTMLElement = document.getElementById("appContainer")!;

(async () => {
    const app = new Application();
    await app.init({
        antialias: false,
        roundPixels: true,
        background: '#EAFFEA',
        width: 800,
        height: 600,
        sharedTicker: true,
        resizeTo: window
    })
    TextureStyle.defaultOptions.scaleMode = 'nearest';
    TexturePool.textureOptions.scaleMode = 'nearest';
    await Assets.init({manifest: manifest, basePath: 'assets'});
    await Assets.loadBundle('card');
    
    appContainerElem.appendChild(app.canvas);

    Ticker.shared.minFPS = 60;

    const tableEngine = await TableEngine.initialize(app);
    // testRender(app);

    tableEngine.run();
    app.renderer.on('resize', (width, height) => {
        recursiveResize(app.stage, width, height);
    })
    setInterval(() => {
        console.log(tableEngine.tableState.entities);
    }, 2000)
})();

function testRender(app: Application) {
    const miniCard = new CardSprite("card0", new Card(Suits.Spades, 10));

    miniCard.filters = [Filters.oilSlickFilter(app)];
    app.stage.addChild(miniCard);
    // const waveFilter = Filter.from({
    //     gl: {
    //         fragment: fragmentShader,
    //         vertex: vertexShader
    //     },
    //     resources: {
    //         waveUniforms: {
    //             uWaveAmplitude: { value: 0.05, type: 'f32' },
    //             uWaveFrequency: { value: 10.0, type: 'f32' },
    //             uTime: { value: 0.0, type: 'f32' },
    //         },
    //     },
    // });

    // const card0 = new CardSprite("card0", new Card(Suits.Spades, 1));
    // const card1 = new CardSprite("card1", new Card(Suits.Diamonds, 2));
    // const card2 = new CardSprite("card2", new Card(Suits.Clubs, 12));
    // const card3 = new CardSprite("card3", new Card(Suits.Hearts, 13));

    // card3.filters = [waveFilter];

    // app.ticker.add((ticker) => {
    //     waveFilter.resources.waveUniforms.uniforms.uTime += 0.1 * ticker.deltaTime;
    // });

    // app.stage.addChild(card0);
    // app.stage.addChild(card1);
    // app.stage.addChild(card2);
    // app.stage.addChild(card3);

    // const ownHand = new OwnHandSprite("ownHand", app.renderer.width, app.renderer.height);
    // app.stage.addChild(ownHand);

    // const connectButton = SideButtonManager.connectButton(app, table);

    // const buttonPanel = new VerticalList(10, "right");

    // buttonPanel.addChild(connectButton);

    // app.stage.addChild(buttonPanel);
    // buttonPanel.x = app.renderer.width;
    // buttonPanel.y = app.renderer.height / 2;
}

