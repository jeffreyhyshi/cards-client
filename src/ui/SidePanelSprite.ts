import { FancyButton } from "@pixi/ui";
import { SideButtonSprite } from "./SideButtonSprite";
import type { TableShell } from "../TableShell";
import { Container, Sprite, Texture, type Application } from "pixi.js";
import { ConnectDialog } from "./ConnectDialog";
import type { GrabOpts, TableStateEntity } from "../TableState";
import type { ResizableSprite } from "../sprites/ResizableSprite";
import { VerticalList } from "../sprites/VerticalList";
import type { TableNetwork } from "../TableNetwork";
import type { TableEngine } from "../TableEngine";
import { Pile } from "../models/Pile";

// Internal type for caching panel configurations
type ButtonContext = "connect" | "flip";
type PanelContext = "global" | "pile" | "hand_card" | "hand_cards";
const PANEL_BUTTON_SPACING = 10;
const PANEL_BUTTON_ORIENTATION = "right";

// Manage the display of the side context panels, inc. animations sliding in and out
export class SidePanelSprite extends Container implements ResizableSprite {
    public get activePanel() {
        return this._activePanel;
    }

    private set activePanel(ap: VerticalList) {
        this.removeChildren();

        this._activePanel = ap;
        this.addChild(ap);
        this._activePanel.x = this.tableEngine.app.renderer.width;
        this._activePanel.y = (this.tableEngine.app.renderer.height * 0.8) / 2;
    }
    private _activePanel: VerticalList;
    private cachedPanels: Map<PanelContext, VerticalList> = new Map();
    private cachedButtons: Map<ButtonContext, FancyButton> = new Map();
    private tableEngine: TableEngine;
    private tableNetwork: TableNetwork;
    private activeContext: PanelContext;

    constructor(table: TableEngine) {
        super();
        this.tableEngine = table;
        this.tableNetwork = table.tableNetwork;
        const globalPanel = this.globalPanel();
        // Appease TS constructor checks
        this._activePanel = globalPanel;
        this.activePanel = globalPanel;
        this.activeContext = "global";
    }


    private connectButton(): FancyButton {
        if (this.cachedButtons.has("connect")) {
            return this.cachedButtons.get("connect")!;
        }

        const button = new FancyButton({
            defaultView: new SideButtonSprite({
                type: "table",
                labelText: "Connect",
                iconSprite: new Sprite(Texture.from("download.png"))
            })
        });

        button.onPress.connect(() => {
            const dialog = ConnectDialog.create(this.tableEngine);
            this.tableEngine.app.stage.addChild(dialog);
            dialog.x = (this.tableEngine.app.renderer.width - 300) / 2;
            dialog.y = (this.tableEngine.app.renderer.height - 300) / 2
        })

        this.cachedButtons.set("connect", button);

        return button;
    }

    private flipPileButton(grabbed: GrabOpts, grabbedEntity: TableStateEntity): FancyButton {
        let button;
        if (this.cachedButtons.has("flip")) {
            button = this.cachedButtons.get("flip")!;
        } else {
            button = new FancyButton({
                defaultView: new SideButtonSprite({
                    type: "card",
                    labelText: "Flip",
                    iconSprite: new Sprite(Texture.from("flip.png")),
                })
            });
            this.cachedButtons.set("flip", button);
        }

        button.onPress.disconnectAll();
        button.onPress.connect(() => {
            this.tableNetwork.tableCall({
                methodName: "flipCards",
                opts: {
                    playerId: this.tableNetwork.myself.id,
                    together: true
                }
            });
        })

        return button;
    }

    private globalPanel(): VerticalList {
        if (!this.cachedPanels.has("global")) {
            const globalPanel = new VerticalList(PANEL_BUTTON_SPACING, PANEL_BUTTON_ORIENTATION);
            globalPanel.addChild(this.connectButton());
            return globalPanel;
        } else {
            return this.cachedPanels.get("global")!;
        }
    }

    private pileContextPanel(grabbed: GrabOpts, grabbedEntity: TableStateEntity): VerticalList {
        if (!this.cachedPanels.has("pile")) {
            const pilePanel = new VerticalList(PANEL_BUTTON_SPACING, PANEL_BUTTON_ORIENTATION);
            pilePanel.addChild(this.flipPileButton(grabbed, grabbedEntity));
            return pilePanel;
        } else {
            return this.cachedPanels.get("pile")!;
        }
    }

    public setContext(grabbed?: GrabOpts, grabbedEntity?: TableStateEntity) {
        if (!grabbed) {
            this.activeContext = "global";
            this.activePanel = this.globalPanel();
        } else if (grabbed && grabbedEntity) {
            this.activeContext = "pile";
            this.activePanel = this.pileContextPanel(grabbed, grabbedEntity);
        }
    }

    public onResize(w: number, h: number) {
        this._activePanel.x = w;
        this._activePanel.y = (h * 0.8) / 2;
    }
}