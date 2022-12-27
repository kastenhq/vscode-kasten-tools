// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as k8s from "vscode-kubernetes-tools-api";
import { addArtifactPallete } from "./bll/artifactCommandPallete";
import { K10Client } from "./api/k10client";
import { ArtifactManager } from "./bll/artifactManager";
import { Node } from "./bll/node";
import * as path from "path";
import { ExtensionContext, Uri } from "vscode";
import { serviceForwardPallete } from "./bll/serviceForwardCommandPallete";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  const kubectl = await k8s.extension.kubectl.v1;

  if (kubectl.available) {
    let client = new K10Client(kubectl.api);
    client.logging = true;
    let am = new ArtifactManager(client);
    let tree = new TreeProvider(am);
    vscode.window.registerTreeDataProvider("kasten.view", tree);

    let disposable = vscode.commands.registerCommand(
      "kasten.open",
      async (content: any[]) => {
        let language = content.length > 1 ? content[1] : "json";
        let fileContent = language === "json" ? JSON.stringify(content[0], undefined, 4) : content[0] as string;
        let doc = vscode.workspace.openTextDocument({ language: language, content: fileContent });
        doc.then((x) => vscode.window.showTextDocument(x));
      }
    );
    vscode.commands.registerCommand(
      "kasten.addOpenArtifactWindow",
      addArtifactPallete(context)
    );

    vscode.commands.registerCommand(
      "kasten.portForwardServiceStart",
      serviceForwardPallete(context, client)
    );

    vscode.commands.registerCommand(
      "kasten.portForwardServiceStop",
      addArtifactPallete(context)
    );

    vscode.commands.registerCommand("kasten.deleteEntry", deleteNode);
    vscode.commands.registerCommand("kasten.refreshEntry", () => tree.refresh());
    vscode.commands.registerCommand("kasten.addEntry", addArtifactPallete(context));
    vscode.commands.registerCommand("kasten.resetTree", () => {
      am.reset();
      tree.refresh();
    });
    vscode.commands.registerCommand("kasten.resetJob", async (job: any) => {
      try {
        await client.resetJob(job.obj.id);
      } catch {
        vscode.window.showErrorMessage("Failed reseting job");
      }
    });

    vscode.commands.registerCommand("kasten.decryptKey", async (key: any) => {
      try {
        await client.decryptKey(key?.artifact?.meta?.encryptionKey?.cipherText);
      } catch {
        vscode.window.showErrorMessage("Failed decrypting key");
      }
    });


    vscode.commands.registerCommand("kasten.addArtifactByID", (id: string) => {
      am.addRootItems(id);
      tree.refresh();
    });

    vscode.commands.registerCommand(
      "kasten.addArtifactsByFilter",
      async ({ key, value }) => {
        am.addFilter(key, value);
        tree.refresh();
      }
    );

    //TODO implement to make not dirty file explorer
    //vscode.workspace.registerFileSystemProvider(K10S_RESOURCE_SCHEME, resourceDocProvider, { }),

    context.subscriptions.push(disposable);
  }
}

class TreeProvider implements vscode.TreeDataProvider<Node> {
  private _onDidChangeTreeData: vscode.EventEmitter<Node | undefined> =
    new vscode.EventEmitter<Node | undefined>();

  readonly onDidChangeTreeData: vscode.Event<Node | undefined> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
  constructor(private rootManager: ArtifactManager) { }

  getTreeItem(element: Node): vscode.TreeItem | Thenable<vscode.TreeItem> {
    // const treeItem = new vscode.TreeItem(element.getLabel(), element.collapsibleState);
    element.label = element.getLabel();
    element.iconPath = element.getIcon();
    return element;
  }
  getChildren(element?: Node | undefined): vscode.ProviderResult<Node[]> {
    if (element === undefined) {
      return this.rootManager.getRootItems();
    }
    if (!element) {
      return [];
    }
    return element.getChildren();
  }
}

async function deleteNode() {
  //delete
  //  refresh();
  return null;
}

async function addNode() {
  //add new id
  //  refresh();
  return null;
}

// this method is called when your extension is deactivated
export function deactivate() { }

let EXTENSION_CONTEXT: ExtensionContext | null = null;

export function setAssetContext(context: ExtensionContext) {
  EXTENSION_CONTEXT = context;
}

export function assetPath(relativePath: string): string {
  if (EXTENSION_CONTEXT) {
    // which it always should be
    return EXTENSION_CONTEXT.asAbsolutePath(relativePath);
  }
  const absolutePath = path.join(__dirname, "..", relativePath);
  return absolutePath;
}

export function assetUri(relativePath: string): Uri {
  return Uri.file(assetPath(relativePath));
}
