document.addEventListener('DOMContentLoaded',function(){
  if(document.fonts&&document.fonts.ready){
    document.fonts.ready.then(function(){
      document.body.classList.add('loaded');
    });
  }else{
    setTimeout(function(){
      document.body.classList.add('loaded');
    },100);
  }
});

// 保存キー
const STORAGE_KEY='htmlEditor_codes';
const CURRENT_CODE_KEY='htmlEditor_current';

// DOM要素の取得
const editor=document.getElementById('htmlEditor');
const status=document.getElementById('status');
const savedCodesList=document.getElementById('savedCodesList');
const syntaxHighlight=document.getElementById('syntaxHighlight');
const lineNumbers=document.getElementById('lineNumbers');

// シンタックスハイライト用の正規表現
const syntaxRules=[
  // HTMLコメント
  {regex:/&lt;!--.*?--&gt;/g,className:'html-comment'},
  // 文字列リテラル
  {regex:/&quot;[^&quot;]*&quot;/g,className:'html-string'},
  {regex:/'[^']*'/g,className:'html-string'},
  // HTMLタグ
  {regex:/&lt;\/?[a-zA-Z][a-zA-Z0-9]*[^&]*?&gt;/g,className:'html-tag'},
  // JavaScript予約語
  {regex:/\b(function|const|let|var|if|else|for|while|return|true|false|null|undefined)\b/g,className:'js-keyword'},
  // CSS プロパティ（コロンで判定）
  {regex:/([a-zA-Z-]+)\s*:/g,className:'css-property'},
  // JavaScriptコメント
  {regex:/\/\/.*$/gm,className:'js-comment'}
];

// ページ読み込み時の初期化
window.addEventListener('load',function(){
  loadCurrentCode();
  displaySavedCodes();
  updateLineNumbers();
  updateHighlight();
  
  // エディターイベント
  editor.addEventListener('input',function(){
    updateLineNumbers();
    updateHighlight();
    syncScroll();
    scrollToCursor();
    
    // オートセーブ
    clearTimeout(window.autoSaveTimer);
    window.autoSaveTimer=setTimeout(function(){
      saveCurrentCode();
    },1000);
  });
  
  editor.addEventListener('scroll',syncScroll);
  editor.addEventListener('keydown',handleSpecialKeys);
  editor.addEventListener('keyup',scrollToCursor);
  
  // 初期同期
  syncScroll();
});

// 特殊キーの処理（オートインデント、タブ挿入）
function handleSpecialKeys(e){
  if(e.key==='Tab'){
    e.preventDefault();
    insertAtCursor('  ');
    return;
  }
  
  if(e.key==='Enter'){
    e.preventDefault();
    const cursorPos=editor.selectionStart;
    const textBefore=editor.value.substring(0,cursorPos);
    const currentLine=textBefore.split('\n').pop();
    
    // 現在行のインデントを取得
    const indentMatch=currentLine.match(/^(\s*)/);
    let indent=indentMatch?indentMatch[1]:'';
    
    // 追加インデントが必要かチェック
    if(currentLine.trim().endsWith('{')||
       currentLine.trim().endsWith('>')||
       currentLine.trim().match(/<[^/>]*>$/)){
      indent+='  ';
    }
    
    insertAtCursor('\n'+indent);
    return;
  }
  
  // 括弧の自動補完
  const pairs={'(':')','{':'}','[':']','"':'"',"'":"'"};
  if(pairs[e.key]){
    e.preventDefault();
    const start=editor.selectionStart;
    const end=editor.selectionEnd;
    const selectedText=editor.value.substring(start,end);
    
    if(selectedText){
      // 選択テキストを括弧で囲む
      insertAtCursor(e.key+selectedText+pairs[e.key]);
    }else{
      // 括弧ペアを挿入してカーソルを中間に
      insertAtCursor(e.key+pairs[e.key]);
      editor.selectionStart=editor.selectionEnd=start+1;
    }
    return;
  }
}

// カーソル位置にテキスト挿入
function insertAtCursor(text){
  const start=editor.selectionStart;
  const end=editor.selectionEnd;
  const before=editor.value.substring(0,start);
  const after=editor.value.substring(end);
  
  editor.value=before+text+after;
  editor.selectionStart=editor.selectionEnd=start+text.length;
  
  updateLineNumbers();
  updateHighlight();
  syncScroll();
  scrollToCursor();
}

// スクロール同期
function syncScroll(){
  syntaxHighlight.scrollTop=editor.scrollTop;
  syntaxHighlight.scrollLeft=editor.scrollLeft;
  lineNumbers.scrollTop=editor.scrollTop;
}

// カーソル位置にスクロールを追従
function scrollToCursor(){
  setTimeout(function(){
    const cursorPos=editor.selectionStart;
    const textBefore=editor.value.substring(0,cursorPos);
    const lines=textBefore.split('\n');
    const currentLine=lines.length;
    const lineHeight=21; // 1.5em * 14px = 21px
    
    // カーソルのY位置を計算
    const cursorY=(currentLine-1)*lineHeight;
    const editorHeight=editor.clientHeight-32;
    
    // 現在のスクロール位置
    const scrollTop=editor.scrollTop;
    
    // カーソルが見える範囲外の場合はスクロール
    if(cursorY<scrollTop){
      // カーソルが上に隠れている場合
      editor.scrollTop=Math.max(0,cursorY-lineHeight*2);
    }else if(cursorY>scrollTop+editorHeight-lineHeight*3){
      // カーソルが下に隠れている場合
      editor.scrollTop=cursorY-editorHeight+lineHeight*5;
    }
    
    // ハイライト表示も同期
    syncScroll();
  },0);
}

// 行番号更新
function updateLineNumbers(){
  const lines=editor.value.split('\n');
  const lineCount=lines.length;
  let numbersHTML='';
  
  for(let i=1;i<=lineCount;i++){
    numbersHTML+=i+'\n';
  }
  
  lineNumbers.textContent=numbersHTML;
}

// シンタックスハイライト更新
function updateHighlight(){
  let highlightedCode=editor.value;
  
  // HTMLエスケープ
  highlightedCode=highlightedCode
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
  
  // 各ルールを適用
  syntaxRules.forEach(rule=>{
    highlightedCode=highlightedCode.replace(rule.regex,function(match){
      return `<span class="${rule.className}">${match}</span>`;
    });
  });
  
  syntaxHighlight.innerHTML=highlightedCode;
}

// キーボードショートカット
document.addEventListener('keydown',function(e){
  if(e.ctrlKey&&e.key==='Enter'){
    e.preventDefault();
    previewCode();
  }else if(e.ctrlKey&&e.key==='s'){
    e.preventDefault();
    saveCode();
  }
});

// 現在のコードを一時保存
function saveCurrentCode(){
  localStorage.setItem(CURRENT_CODE_KEY,editor.value);
}

// 現在のコードを読み込み
function loadCurrentCode(){
  const savedCode=localStorage.getItem(CURRENT_CODE_KEY);
  if(savedCode){
    editor.value=savedCode;
  }
}

// プレビュー機能
function previewCode(){
  const htmlCode=editor.value.trim();
  
  if(!htmlCode){
    showStatus('コードを入力してください','error');
    return;
  }

  const previewWindow=window.open('','_blank');
  
  if(previewWindow){
    previewWindow.document.write(htmlCode);
    previewWindow.document.close();
    showStatus('プレビューを新しいタブで開きました','success');
  }else{
    showStatus('ポップアップがブロックされました。ブラウザの設定を確認してください','error');
  }
}

// コード保存機能
function saveCode(){
  const htmlCode=editor.value.trim();
  
  if(!htmlCode){
    showStatus('保存するコードがありません','error');
    return;
  }

  const timestamp=new Date().toLocaleString('ja-JP');
  const codeTitle=prompt('コードのタイトルを入力してください（省略可）:')||`保存 ${timestamp}`;
  
  const savedCodes=getSavedCodes();
  const newCode={
    id:Date.now(),
    title:codeTitle,
    code:htmlCode,
    timestamp:timestamp
  };
  
  savedCodes.unshift(newCode);
  
  if(savedCodes.length>10){
    savedCodes.splice(10);
  }
  
  localStorage.setItem(STORAGE_KEY,JSON.stringify(savedCodes));
  displaySavedCodes();
  showStatus(`「${codeTitle}」を保存しました`,'success');
}

// 保存されたコードを取得
function getSavedCodes(){
  const saved=localStorage.getItem(STORAGE_KEY);
  return saved?JSON.parse(saved):[];
}

// 保存されたコード一覧を表示
function displaySavedCodes(){
  const savedCodes=getSavedCodes();
  
  if(savedCodes.length===0){
    savedCodesList.innerHTML=`
      <div class="empty-state">
        <p>保存されたコードはありません</p>
      </div>
    `;
    return;
  }
  
  let html='';
  savedCodes.forEach(item=>{
    const preview=item.code.substring(0,50).replace(/</g,'&lt;').replace(/>/g,'&gt;');
    html+=`
      <div class="saved-item">
        <div class="saved-item-header">
          <div class="saved-item-title">${item.title}</div>
          <div class="saved-item-date">${item.timestamp}</div>
        </div>
        <div class="saved-item-preview">${preview}${item.code.length>50?'...':''}</div>
        <div class="saved-item-actions">
          <button class="btn btn-small btn-load" onclick="loadCode(${item.id})">読み込み</button>
          <button class="btn btn-small btn-load" onclick="previewSavedCode(${item.id})">プレビュー</button>
          <button class="btn btn-small btn-delete" onclick="deleteCode(${item.id})">削除</button>
        </div>
      </div>
    `;
  });
  
  savedCodesList.innerHTML=html;
}

// 保存されたコードを読み込み
function loadCode(id){
  const savedCodes=getSavedCodes();
  const code=savedCodes.find(item=>item.id===id);
  
  if(code){
    editor.value=code.code;
    saveCurrentCode();
    updateLineNumbers();
    updateHighlight();
    syncScroll();
    showStatus(`「${code.title}」を読み込みました`,'success');
  }
}

// 保存されたコードをプレビュー
function previewSavedCode(id){
  const savedCodes=getSavedCodes();
  const code=savedCodes.find(item=>item.id===id);
  
  if(code){
    const previewWindow=window.open('','_blank');
    if(previewWindow){
      previewWindow.document.write(code.code);
      previewWindow.document.close();
      showStatus(`「${code.title}」のプレビューを開きました`,'success');
    }
  }
}

// 保存されたコードを削除
function deleteCode(id){
  const savedCodes=getSavedCodes();
  const codeToDelete=savedCodes.find(item=>item.id===id);
  
  if(codeToDelete&&confirm(`「${codeToDelete.title}」を削除しますか？`)){
    const filteredCodes=savedCodes.filter(item=>item.id!==id);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(filteredCodes));
    displaySavedCodes();
    showStatus('コードを削除しました','success');
  }
}

function showStatus(message,type){
  status.textContent=message;
  status.className=`status show ${type}`;
  
  setTimeout(()=>{
    status.className='status';
  },3000);
}