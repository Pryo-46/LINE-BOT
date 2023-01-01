//作成者：ぷりょ

//GASでは定数が使えないため、varで宣言
//LINE Messaging APIのチャネルアクセストークンを設定（プロパティスクリプトを使用）
var CATOKEN = PropertiesService.getScriptProperties().getProperty("CHANNEL_ACCESS_TOKEN");
var SHEET_NAME_RECORD = "記録";
var SHEET_NAME_STATISTICS ="統計";
var TARGET_KCAL = 2398;  //１日の目標摂取カロリー

function doPost(e){
  let logSheet = doActiveSheet('log');
  //ログの記録
  logSheet.appendRow([new Date(), e.postData.contents]); 
  // LINE から来た json データを JavaScript のオブジェクトに変換する
  const data = JSON.parse(e.postData.contents);
  let events = data.events;

  //main
  for(let i = 0; i < events.length; i++){ // すべてのイベントについて繰り返し処理をする（1回の受信に複数イベント含まれることもあるらしい）
    let event = events[i];
    let i_text = event.message.text

    // メッセージ受信イベントである　かつ テキストメッセージである場合
    if(event.type == 'message' && event.message.type == 'text'){ 
      // 入力が数値である場合
      if(isFinite(parseInt(i_text))){
        let Kcal = parseInt(i_text);
        //カロリーが妥当な値かチェック
        if(isValidKcal(Kcal)){
          // 記録シートに摂取カロリーを追記
          appendKCalTosheet(Kcal);

          //合計カロリーと目標との差を算出
          let todayTotalKcal = fetchTodayTotalKcal();
          let diffOfKcalAndTKCAL = todayTotalKcal - TARGET_KCAL;
          //logSheet.appendRow([new Date(), diffOfKcalAndTKCAL]); 
          let sign = "";
          let alert = "";
          //メッセージ編集
          if (diffOfKcalAndTKCAL >=0){
            sign = "+";
            alert = "\n\n食べ過ぎです。"
          }
          let message = "今日の合計摂取カロリーは、" + todayTotalKcal.toString() + "kcalです。\n\n目標との差異：" + sign + diffOfKcalAndTKCAL.toString() + "Kcal" + alert;

          //ユーザーに今日のトータル摂取カロリーを返信する
          replyMessage(event.replyToken, message, CATOKEN);

        }else{
          //不正なカロリーはエラー
          replyErrorMessage(event.replyToken, "カロリーは1~9999の数値を入力してください。", CATOKEN);
          break;
        }
      }
      //数値じゃない場合はエラー
      replyErrorMessage(event.replyToken, "カロリーは数値を入力してください。", CATOKEN);
      break;
    }
  }
}

// Functions
//今日日付をyyyyMMdd形式で取得する
function getDateYMD(){
  let today = new Date();
  let todayYear = today.getFullYear();
  let todayMonth = today.getMonth() + 1;
  let todayDate = today.getDate();

  //yyyyMMdd形式に変換
  let year = todayYear.toString();
  let month = ("00" + todayMonth).slice(-2);
  let date = ("00" + todayDate).slice(-2);

  return year + month + date
}

//現在時刻をhhmmss形式で取得する
function getNowTimeHMS(){
  let today = new Date();
  let nowHour = today.getHours();
  let nowMinute = today.getMinutes();
  let nowSecond = today.getSeconds();

  //hhmmss形式に変換
  let hour = ("00" + nowHour).slice(-2);
  let minute = ("00" + nowMinute).slice(-2);
  let second = ("00" + nowSecond).slice(-2);

  return hour + minute + second
}

// カロリーが妥当な数値である場合true
function isValidKcal(p_Kcal){
  if(p_Kcal <= 0 || p_Kcal >= 10000){
    return false;
  }
  return true;
}

//シートにカロリーを追記する
function appendKCalTosheet(p_Kcal){
  let recSheet = doActiveSheet(SHEET_NAME_RECORD);
  recSheet.appendRow(['=ROW()-1', p_Kcal, getDateYMD(), getNowTimeHMS()]);
}

//現時点の、今日の合計摂取カロリーを返す
function fetchTodayTotalKcal(){
  let stcSheet = doActiveSheet(SHEET_NAME_STATISTICS);
  let totalKcal = 0;
  //統計シートから今日の合計摂取カロリーを取得する。
  let rowIndex = findRows(stcSheet, getDateYMD(), 1);
  //日付が見つからなかった場合、-1を返す。（異常値）
  if(rowIndex == 0) {
    return -1;
  }
  totalKcal = parseInt(stcSheet.getRange(rowIndex, 2).getValue()); 
  return totalKcal;
}

//指定列の検索値を含む行番号を返す
function findRows(p_sheet,p_val,p_col){
  let lastRow = p_sheet.getDataRange().getLastRow();

  for(var i=1;i<lastRow;i++){
    if(p_sheet.getRange(i,p_col).getValue() == p_val){
      return i;
    }
  } 
  return 0;
}

//指定されたシートをアクティブにし、アクティブシートを返す
function doActiveSheet(p_sheetName){
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(p_sheetName).activate();
  let activeSheet = SpreadsheetApp.getActive().getActiveSheet();

  return activeSheet;
}

// ユーザにメッセージを返す
function replyMessage(p_replyToken, p_replyMsg, p_CAToken){
  //取得したデータから、応答用のトークンを取得
  let replyToken = p_replyToken;
  // 応答メッセージ用のAPI URLを定義
  let url = 'https://api.line.me/v2/bot/message/reply';
  //ユーザーへ応答するメッセージ
  let replyMessage = p_replyMsg

  //APIリクエスト時にセットするペイロード値を設定する
  let payload = {
    'replyToken': replyToken,
    'messages': [{
        'type': 'text',
        'text': replyMessage
      }]
  };

  //HTTPSのPOST時のオプションパラメータを設定する
  let options = {
    'payload' : JSON.stringify(payload),
    'myamethod'  : 'POST',
    'headers' : {"Authorization" : "Bearer " + p_CAToken},
    'contentType' : 'application/json'
  };
  //LINE Messaging APIにリクエストし、ユーザーからの投稿に返答する
  UrlFetchApp.fetch(url, options);
}

// ユーザにエラーメッセージを返す
function replyErrorMessage(p_replyToken, p_replyMsg, p_CAToken){
  //取得したデータから、応答用のトークンを取得
  let replyToken = p_replyToken;
  // 応答メッセージ用のAPI URLを定義
  let url = 'https://api.line.me/v2/bot/message/reply';
  //ユーザーへ応答するメッセージ
  let replyMessage = "入力エラー\n\n" + p_replyMsg;

  //APIリクエスト時にセットするペイロード値を設定する
  let payload = {
    'replyToken': replyToken,
    'messages': [{
        'type': 'text',
        'text': replyMessage
      }]
  };

  //HTTPSのPOST時のオプションパラメータを設定する
  let options = {
    'payload' : JSON.stringify(payload),
    'myamethod'  : 'POST',
    'headers' : {"Authorization" : "Bearer " + p_CAToken},
    'contentType' : 'application/json'
  };
  //LINE Messaging APIにリクエストし、ユーザーからの投稿に返答する
  UrlFetchApp.fetch(url, options);
}