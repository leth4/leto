'use strict';

const editor = document.getElementById('text-editor');
const alphabet = "abcdefghijklmnopqrstuvwxyz";

const MAX_SUGGESTIONS = 10;
const MAX_WORD_LENGTH = 17; 

import {words} from './words.js';

export default class Spellcheck {

  userDictionary;
  toggled = false;
  #wordTrie;

  toggle() {
    if (this.#wordTrie == null) {
      this.#wordTrie = new Trie();
      words.forEach(word => this.#wordTrie.add(word));
      this.userDictionary.forEach(word => this.#wordTrie.add(word));
    }
    this.toggled = !this.toggled;
    leto.preview.setPreviewText();
    leto.lea.updateAllCards();
  }

  setUserDictionary(dictionary) {
    this.userDictionary = dictionary ?? [];
  }

  addCurrentToDictionary() {
    var word = this.#getCurrentWord().toLowerCase();
    this.userDictionary.push(word);
    this.#wordTrie.add(word);
    leto.preview.setPreviewText();
    leto.config.save();
  }

  checkWord(word) {
    return word.length == 0 || this.#wordTrie.contains(word.toLowerCase());
  };

  checkCurrentWord() {
    return this.checkWord(this.#getCurrentWord());
  }

  correctCurrentWord() {
    var word = this.#getCurrentWord();
    if (word.length > MAX_WORD_LENGTH) return;
    var suggestions = this.#getSuggestions(word);
    var sorted = suggestions.sort(this.#compareByScore(word));
    return sorted.slice(0, MAX_SUGGESTIONS);
  }

  #getCurrentWord() {
    if (document.activeElement.nodeName != 'TEXTAREA') return "";
    var activeEditor = document.activeElement;

    var alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'";
    var wordStart, wordEnd;  
    for (var i = activeEditor.selectionStart; i < activeEditor.value.length + 1; i++) {
      wordEnd = i;
      if (!alphabet.includes(activeEditor.value[i])) break;
    }
    for (var i = activeEditor.selectionStart; i >= 0; i--) {
      if (!alphabet.includes(activeEditor.value[i])) break;
      wordStart = i;
    }
    
    return activeEditor.value.substr(wordStart, wordEnd - wordStart);
  }

  #getVariations(word) {
    word = word.toLowerCase().split('');
    var results = [];  
    for (var i = 0; i <= word.length; i++){
      for (var j = 0; j < alphabet.length; j++){
        var newWord = word.slice();
        newWord.splice(i, 0, alphabet[j]);
        results.push(newWord.join(''));
      }
    }  
    if (word.length > 1){
      for (var i = 0; i < word.length; i++){
        var newWord = word.slice();
        newWord.splice(i,1);
        results.push(newWord.join(''));
      }
    }  
    if (word.length > 1){
      for (var i = 0; i < word.length - 1; i++){
        var newWord = word.slice();
        var r = newWord.splice(i,1);
        newWord.splice(i + 1, 0, r[0]);
        results.push(newWord.join(''));
      }
    }  
    for (var i = 0; i < word.length; i++){
      for (var j = 0; j < alphabet.length; j++){
        var newWord = word.slice();
        newWord[i] = alphabet[j];
        results.push(newWord.join(''));
      }
    }  
    return results;
  }

  #getSuggestions(word) {
    var results = [];  
    var edits = this.#getVariations(word);  
    var editsDouble = [];

    for (var i = 0; i < edits.length; i++)
      editsDouble = editsDouble.concat(this.#getVariations(edits[i]));          
    edits = edits.concat(editsDouble);

    for (var i = 0; i < edits.length; i++)
      if (this.#wordTrie.contains(edits[i]) && !results.includes(edits[i]) && edits[i] != word) 
        results.push(edits[i]);  
    return results;
  }

  #compareByScore(word) {
      
    return function(a, b) {
      const scoreA = scoreSimularity(a, word);
      const scoreB = scoreSimularity(b, word);  
      if (scoreA < scoreB) return -1;
      if (scoreA > scoreB) return 1;
      return 0;
    }  

    function scoreSimularity(word1, word2) {
      var distance = calculateLevenshteinDistance(word1, word2);
      var firstLetter = word1[0] == word2[0] ? 0 : 2;
      var soundDistance = calculateLevenshteinDistance(soundex(word1), soundex(word2));
      return distance + firstLetter + soundDistance;
    }  

    function calculateLevenshteinDistance(a, b) {
      const c = a.length + 1;
      const d = b.length + 1;
      const r = Array(c);
      for (let i = 0; i < c; ++i) r[i] = Array(d);
      for (let i = 0; i < c; ++i) r[i][0] = i;
      for (let j = 0; j < d; ++j) r[0][j] = j;
      for (let i = 1; i < c; ++i) {
        for (let j = 1; j < d; ++j) {
          const s = (a[i - 1] === b[j - 1] ? 0 : 1);
          r[i][j] = Math.min(r[i - 1][j] + 1, r[i][j - 1] + 1, r[i - 1][j - 1] + s);
        }
      }
      return r[a.length][b.length];
    }

    function soundex(name) {
      let s = [];
      let si = 1;
      let c;
      let mappings = "01230120022455012623010202";
      s[0] = name[0].toUpperCase();  
      for (let i = 1, l = name.length; i < l; i++)
      {
        c = (name[i].toUpperCase()).charCodeAt(0) - 65;
        if (c >= 0 && c <= 25)
        {
          if (mappings[c] != '0') {
            if (mappings[c] != s[si-1]) {
              s[si] = mappings[c];
              si++;
            }
            if (si > 3) break;
          }
        }
      }
      if (si <= 3) {
        while(si <= 3) {
          s[si] = '0';
          si++;
        }
      }
      return s.join('');
    }
  }
}

class Trie {

  constructor() {
    this.root = new TrieNode();
  }  

  add(word) {
    if (!word) return false;  
    let currNode = this.root;  
    for (const letter of word) {
      if (!currNode.children.has(letter)) currNode.children.set(letter, new TrieNode(letter));
      currNode = currNode.children.get(letter);
    }  
    currNode.endOfWord = true;
    return currNode;
  }  

  contains(word, start = this.root) {
    if (!word) return false;  
    let currNode = start;
    for (const letter of word) {
      if (!currNode.children.has(letter)) return false;
      currNode = currNode.children.get(letter);
    }  
    return currNode.endOfWord;
  }
}

class TrieNode {

  constructor(value = '') {
    this.children = new Map();
    this.value = value;
    this.endOfWord = false;
  }

}