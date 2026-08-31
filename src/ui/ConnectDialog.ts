import { Dialog, FancyButton, Input } from "@pixi/ui";
import { BitmapText, Container, NineSliceSprite, TextStyle, Texture, TilingSprite } from "pixi.js";
import type { TableShell } from "../TableShell";


export class ConnectDialog extends Container {
    static create(table: TableShell): ConnectDialog {
        let codeText = table.tableNetwork.tableId ? table.tableNetwork.tableId.toUpperCase() : 
            "??????";

        let label = new BitmapText({
            text: codeText,
            style: {
                fontFamily: 'CMU Typewriter Text',
                fontSize: 36,
                fill: 0,
                fontVariant: 'small-caps'
            }
        })

        let input = new Input({
            bg: Texture.from("input.png"),
            textStyle: new TextStyle({
                fontFamily: 'CMU Typewriter Text',
                fontSize: 36,
                fill: 0,
                letterSpacing: 28,
            }),
            align: "left",
            padding: {
                left: 11
            },
            maxLength: 6
        });

        let container = new Container({
            children: [label, input]
        });
        input.y = 50;

        let cancelButton = new FancyButton({
            text: "Cancel"
        });

        let okButton = new FancyButton({
            text: "Ok"
        });

        let dialog = new ConnectDialog(container, cancelButton, okButton);

        cancelButton.onPress.connect(() => {
            dialog.visible = false;
        });

        okButton.onPress.connect(() => {
            if (input.value && table.tableNetwork.tableId) {
                table.tableNetwork.connectToPeerTable(input.value.toLowerCase());
            }
        });

        return dialog;
    }

    private constructor(content: Container, cancelButton: FancyButton, okButton: FancyButton) {
        const background = new NineSliceSprite({
            texture: Texture.from("modal.png"),
            topHeight: 9,
            bottomHeight: 9,
            leftWidth: 13,
            rightWidth: 13,
            width: 300,
            height: 300
        });
        super({
            children: [background, content, cancelButton, okButton]
        })
        content.x = 10
        content.y = 10
        cancelButton.x = 60;
        cancelButton.y = 200;
        okButton.x = 200;
        okButton.y = 200;
    }
}