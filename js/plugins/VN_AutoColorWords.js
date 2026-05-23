//=============================================================================
// VN_AutoColorWords.js
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Colore automaticamente palavras específicas.
 *
 * @param coloredWords
 * @text Palavras Coloridas
 * @type struct<ColoredWord>[]
 * @default []
 */

/*~struct~ColoredWord:
 * @param word
 * @text Palavra
 * @type text
 *
 * @param colorId
 * @text ID da Cor
 * @type number
 * @default 0
 */

(() => {

"use strict";

//=============================================================================
// PARAMETERS
//=============================================================================

const params =
    PluginManager.parameters(
        "VN_AutoColorWords"
    );

const coloredWords =
    JSON.parse(
        params.coloredWords || "[]"
    ).map(e => JSON.parse(e));

//=============================================================================
// CONVERT ESCAPE
//=============================================================================

const _Window_Base_convertEscapeCharacters =
    Window_Base.prototype.convertEscapeCharacters;

Window_Base.prototype.convertEscapeCharacters =
    function(text) {

    text =
        _Window_Base_convertEscapeCharacters.call(
            this,
            text
        );

    for (const entry of coloredWords) {

        const word =
            entry.word;

        const colorId =
            Number(entry.colorId);

        const colored =
            `\x1bC[${colorId}]${word}\x1bC[0]`;
            
        const regex =
            new RegExp(
                escapeRegExp(word),
                "g"
            );

        text =
            text.replace(
                regex,
                colored
            );
    }

    return text;
};

//=============================================================================
// ESCAPE REGEX
//=============================================================================

function escapeRegExp(string) {

    return string.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}

})();