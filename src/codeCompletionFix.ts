import delay = require('delay');
import * as vscode from 'vscode';

import { MACRO_EXP_FIX_MIN_CODE_COMPLETION_LENGTH, ParamHints} from './libs/consts';

//import * as console from './libs/console';


const RE_FUNC_COMPLETION_NAME_KEY = "name";
const RE_FUNC_COMPLETION_PARAMS_KEY = "params";
const RE_DELEGATE_DEFINE_NAME_KEY = "defineName";

interface GroupFunctionCompletion {
    [RE_FUNC_COMPLETION_NAME_KEY]: string,
    [RE_FUNC_COMPLETION_PARAMS_KEY]: string
}

interface GroupDelegateFuncDefineName {
    [RE_DELEGATE_DEFINE_NAME_KEY]: string
}

const RE_DELEGATE_DEFINE_FUNC_NAMES = "BindDynamic|IsAlreadyBound|AddDynamic|AddUniqueDynamic|RemoveDynamic";

const RE_FOR_GETTINGS_ALL_FUNCS_EXCEPT_DELEGATE_DEFINE_FUNC_NAMES = new RegExp(`^(?!(${RE_DELEGATE_DEFINE_FUNC_NAMES}))(?<${RE_FUNC_COMPLETION_NAME_KEY}>[a-zA-Z][\\w]+)(?<${RE_FUNC_COMPLETION_PARAMS_KEY}>\\([\\w\\s:<>&*,]*\\))$`, "m");

const RE_FOR_GETTING_UNDER_SCORE_DELEGATE_DEFINE_NAME = new RegExp(`^__Internal_(?<${RE_DELEGATE_DEFINE_NAME_KEY}>${RE_DELEGATE_DEFINE_FUNC_NAMES})\\([\\w\\s:<>&*,]*\\)$`, 'm');
const SNIP_STR_DELEGATE_FUNC_DEFINE_PARAM_SIGNATURE = "( ${1:UserObject}, ${2:FuncName})$0";
const EMPTY_PARAMETER_FUNCTION = 2;
const CMD_TRIGGER_PARAM_HINTS = "editor.action.triggerParameterHints";

let paramHintsSettingValue: ParamHints = ParamHints.needed;
let isdelegateFuncCompletionsFix = true;
let isAutoIncludeHeaders = true;
let focusSuggestionDelaySetting = 350;


export const onDidChangeTextDocument = async (e: vscode.TextDocumentChangeEvent) => {

    const currentActiveEditor = vscode.window.activeTextEditor;
    if(e.contentChanges.length === 0 || e.document !== currentActiveEditor?.document){
        return;
    }
 
    const firstContentChange = e.contentChanges[0];

    /*
    if(focusSuggestionDelaySetting !== 0 && e.contentChanges.length === 1 && firstContentChange.text.length === 1){
        await delay(focusSuggestionDelaySetting);
        await vscode.commands.executeCommand(VSCODE_CMD_FOCUS_SUGGESTION);
    }
    */

    if(firstContentChange.text.length < MACRO_EXP_FIX_MIN_CODE_COMPLETION_LENGTH || !firstContentChange.range.isSingleLine || e.reason){
        return;
    }

    
    if(isAutoIncludeHeaders && e.contentChanges.length === 1 && e.document.fileName.endsWith(".h") && e.contentChanges[0].text.startsWith("#include \"")){
        await removeAutoIncludeFromHeader(e);
    }
        
    const delegateFunctionCompletion: GroupDelegateFuncDefineName | undefined = firstContentChange.text.match(RE_FOR_GETTING_UNDER_SCORE_DELEGATE_DEFINE_NAME)?.groups as GroupDelegateFuncDefineName | undefined;

    if(delegateFunctionCompletion && isdelegateFuncCompletionsFix){ 
        const editPositionEnd: vscode.Position = new vscode.Position(firstContentChange.range.start.line, firstContentChange.range.start.character + firstContentChange.text.length);
        const replacement: vscode.SnippetString = new vscode.SnippetString(`${delegateFunctionCompletion[RE_DELEGATE_DEFINE_NAME_KEY]}${SNIP_STR_DELEGATE_FUNC_DEFINE_PARAM_SIGNATURE}`);
        await currentActiveEditor.insertSnippet(replacement, new vscode.Range(firstContentChange.range.start, editPositionEnd));

        return;
    }


    if(paramHintsSettingValue === ParamHints.disabled){
        return;
    }
    
    const functionCompletion: GroupFunctionCompletion | undefined = firstContentChange.text.match(RE_FOR_GETTINGS_ALL_FUNCS_EXCEPT_DELEGATE_DEFINE_FUNC_NAMES)?.groups as GroupFunctionCompletion | undefined;
    
    if(functionCompletion){
        await delay(50);  // cursor position(selection) needs time to update to correct position (clangd moves cursor based on fnc type)

        const firstParen = firstContentChange.range.start.character + functionCompletion[RE_FUNC_COMPLETION_NAME_KEY].length;
        const lastParen = firstContentChange.range.start.character + firstContentChange.text.length;
        
        const cursorPos = currentActiveEditor.selection.active.character;
        const isInsideFirstParen = cursorPos > firstParen;
        const isInsideLastParen = cursorPos < lastParen;

        // Don't need to check param setting value because this should always trigger if cursor position is inside parens
        if(isInsideFirstParen && isInsideLastParen){
            await vscode.commands.executeCommand(CMD_TRIGGER_PARAM_HINTS);
        }
        else if(paramHintsSettingValue === ParamHints.all && cursorPos === lastParen && (lastParen - firstParen) === EMPTY_PARAMETER_FUNCTION){
            const insidefirstParenPos = new vscode.Position(firstContentChange.range.start.line, firstParen + 1);
            currentActiveEditor.selection = new vscode.Selection(insidefirstParenPos, insidefirstParenPos);
            await vscode.commands.executeCommand(CMD_TRIGGER_PARAM_HINTS);
        }
        
        return;
    }
    
    return;

};


export function setParamHintsSettingValue(value: ParamHints){
    paramHintsSettingValue = value;
}


export function setDelegateFuncCompletionsFix(value: boolean){
    isdelegateFuncCompletionsFix = value;
}

export function setAutoIncludeHeaders(value: boolean){
    isAutoIncludeHeaders = value;
}

export function setFocusSuggestionDelay(value: number){
    focusSuggestionDelaySetting = value;
}


async function removeAutoIncludeFromHeader(e: vscode.TextDocumentChangeEvent) {

    const lineToDelete = e.contentChanges[0].range.start.line;

    const editor = vscode.window.activeTextEditor;

    if(!editor || editor.document !== e.document){
        return;
    }

    await delay(50);
    await editor.edit(editBuilder => {
        const deleteRange = e.document.lineAt(lineToDelete).rangeIncludingLineBreak; 
        
        editBuilder.delete(deleteRange);
    }, {undoStopBefore: true, undoStopAfter: true});

}

