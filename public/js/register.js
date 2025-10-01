document.addEventListener('DOMContentLoaded',function(){
  // モーダル要素の取得
  const tipButton=document.getElementById('tip');
  const modalOverlay=document.getElementById('modal-overlay');
  const modalClose=document.getElementById('modal-close');
  // モーダルを開く
  function openModal(){
    modalOverlay.classList.add('show');
    // フォーカスをモーダルに移動（アクセシビリティ向上）
    modalClose.focus();
  }
  // モーダルを閉じる
  function closeModal(){
    modalOverlay.classList.remove('show');
    // フォーカスを元の要素に戻す
    tipButton.focus();
  }
  // イベントリスナーの設定
  tipButton.addEventListener('click',openModal);
  modalClose.addEventListener('click',closeModal);
  // オーバーレイをクリックしたときもモーダルを閉じる
  modalOverlay.addEventListener('click',function(e){
    if(e.target===modalOverlay){
      closeModal();
    }
  });
  // Escキーでモーダルを閉じる
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&modalOverlay.classList.contains('show')){
      closeModal();
    }
  });
});