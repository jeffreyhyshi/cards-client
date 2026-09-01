import { FancyButton } from "@pixi/ui";
import { SideButtonSprite } from "./SideButtonSprite";
import type { TableShell } from "../TableShell";
import { Container, type Application } from "pixi.js";
import { ConnectDialog } from "../ui/ConnectDialog";
import type { GrabOpts } from "../TableState";
import type { ResizableSprite } from "./ResizableSprite";
import { VerticalList } from "./VerticalList";

// Internal type for caching panel configurations
type panelContext = "global" | "pile" | "hand_card" | "hand_cards";
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
        this._activePanel.x = this.tableShell.app.renderer.width;
        this._activePanel.y = (this.tableShell.app.renderer.height * 0.8) / 2;
    }
    private _activePanel: VerticalList;
    private cachedPanels: Map<panelContext, VerticalList> = new Map();
    private tableShell: TableShell;

    private connectButton(): FancyButton {
        const button = new FancyButton({
            defaultView: new SideButtonSprite({
                type: "table",
                labelText: "Connect"
            })
        });

        button.onPress.connect(() => {
            const dialog = ConnectDialog.create(this.tableShell);
            this.tableShell.app.stage.addChild(dialog);
            dialog.x = (this.tableShell.app.renderer.width - 300) / 2;
            dialog.y = (this.tableShell.app.renderer.height - 300) / 2
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

    public setContext(grabbed?: GrabOpts) {
        if (!grabbed) {
            this.activePanel = this.globalPanel();
        } else {
            // TODO: other cases
        }
    }

    constructor(table: TableShell) {
        super();
        this.tableShell = table;
        const globalPanel = this.globalPanel();
        // Appease TS constructor checks
        this._activePanel = globalPanel;
        this.activePanel = globalPanel;
    }

    public onResize(w: number, h: number) {
        this._activePanel.x = w;
        this._activePanel.y = (h * 0.8) / 2;
    }
}