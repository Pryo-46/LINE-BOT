// doGet() ではなく doPost(e) を使う
function doPost(e){
  //LINE Messaging APIのチャネルアクセストークンを設定（プロパティスクリプトを使用）
  const CATOKEN = PropertiesService.getScriptProperties().getProperty("CHANNEL_ACCESS_TOKEN");
  // 使用するシート
  let sheet = SpreadsheetApp.getActive().getActiveSheet();
  //sheet.appendRow([new Date(), e.postData.contents]);
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
          //合計カロリーと目標との差を算出
          //let totalKcal = calcTodayTotalKcal(Kcal)

          
          // スプレッドシートに追記
          appendKCalTosheet(Kcal, sheet);

          //メッセージ編集
          // let message = "今日の合計摂取カロリーは、" + calcTodayTotalKcal(sheet) + "Kcalです。\n"; 
          let message = "今日の合計摂取カロリーは、" + Kcal + "kcalです。\n";           


          //ユーザーに今日のトータル摂取カロリーを返信する
          replyMessage(event.replyToken, message);

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
//今日日付をYYYYMMDDhhmm形式で取得する
function getDateYYYYMMDDhhmm(){
  let today = new Date();
  let todayYear = today.getFullYear();
  let todayMonth = today.getMonth() + 1;
  let todayDate = today.getDate();
  let nowHour = today.getHours();
  let nowMinute = today.getMinutes();

  //YYYYMMDDhhmm形式に変換
  let year = todayYear.toString();
  let month = ("00" + todayMonth).slice(-2);
  let date = ("00" + todayDate).slice(-2);
  let hour = ("00" + nowHour).slice(-2);
  let minute = ("00" + nowMinute).slice(-2);

  return year + month + date + hour + minute
}


// カロリーが妥当な数値である場合true
function isValidKcal(p_Kcal){
  if(p_Kcal <= 0 || p_Kcal >= 10000){
    return false;
  }
  return true;
}

//シートにカロリーを追記する
function appendKCalTosheet(p_Kcal, p_sheet){
  p_sheet.appendRow(['=ROW()-1', p_Kcal, getDateYYYYMMDDhhmm()]);
}

//TODO:今日の合計摂取カロリーを算出する
function calcTodayTotalKcal(p_sheet){
  let totalKcal = 0;
  let val = getDateYYYYMMDDhhmm().substring(0,8);
  let kCalarray = p_sheet.getDataRange(2,3,2,lastRow).getValues();
  let array = findRows(p_sheet, val, 3);
  for(let i = 0; i < array.length; i++){
    totalKcal += kCalarray[array[i]]
  }

  return totalKcal;
}

//指定列の検索値を含む行番号を返す
function findRows(p_sheet,p_val,p_col){
  let sheetArray = p_sheet.getDataRange().getValues(); //受け取ったシートのデータを二次元配列に取得
  let indexArray = [];

  for(var i=1;i<sheetArray.length;i++){
    if(colArray[i][p_col].includes(p_val)){
      indexArray.push(i)
    }
  }
  return indexArray;
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
  let replyMessage = "入力エラー\n\n" & p_replyMsg

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

