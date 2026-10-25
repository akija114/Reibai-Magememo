/* 冷媒配管の曲げ共有：kiso.js（📘 空調の種類と電線：初心者向けの説明・選び方・電線の目安・材料拾いのコツ）
   機器の画面（kiki.html）で読む。データ airConditionerMaster をそのまま足し引きすればOK。
   電線・ブレーカーは「よくある目安」。必ずメーカーの据付説明書・電気設計図・内線規程（電圧降下）で確定する */
const airConditionerMaster = [
/* ===================== 1. システム・用途別 ===================== */
{id:"ehp_general", name:"EHP（電気ヒートポンプエアコン）", category:"システム",
 description:"電気でコンプレッサー（圧縮機）を回して、冷媒で熱を運ぶエアコンの総称です。家庭のルームエアコン、店舗のパッケージエアコン、ビルマルチも電気で動けばすべてEHPです。\nGHPとの違いは「コンプレッサーを回す力が電気か、ガスか」だけ。EHP＝電気モーター、GHP＝ガスエンジン。冷媒で熱を運ぶしくみ（ヒートポンプ）は同じです。",
 usage_scene:["住宅","オフィス","店舗","学校","病院","ほぼすべての建物"],
 pros_cons:{pros:["機種が多く、選びやすい・部品も手に入りやすい","エンジンが無いので定期点検が少なくて済む","室外機が小さく軽い","小さい能力から大きい能力までそろう"],
  cons:["電気の契約容量（kW）が大きくなる。動力（三相200V）の契約が要ることが多い","真冬の暖房は霜取り運転で止まることがある（寒冷地は寒冷地仕様を選ぶ）"]},
 electrical_spec:{power:"ルーム：単相100V または 単相200V（専用回路・VVF 2.0mm-2芯＋接地）。パッケージ・ビルマル：三相200V 動力（能力で 2.0mm〜14sq 以上・下の「動力の電線の目安」）",
  inter_unit:"VVF 1.6〜2.0mm-3芯（室外機から室内機へ電源も一緒に送る機種が多い）",
  transmission:"ビルマル・同時マルチは伝送線（メーカー指定のより線・シールド線）",
  remote:"ワイヤードリモコン：2芯（メーカー指定・例 VCTF 0.3〜1.25mm²）",
  breaker:"ルーム：20A（専用）。動力：漏電遮断器（感度30mA）を能力に合わせて",
  notes:["接地（アース）は D種接地。電源線の3芯目（緑）か IV 線で必ず取る","電線の太さは「電流」と「長さ（電圧降下）」の両方で決まる。長い時は1つ太く"]},
 material_notes:["電源がどこから来るか（分電盤・動力盤）と、新しい回路が要るかを最初に確認","100V／200V・単相／三相を室外機の銘板で必ず確認してから電線を拾う","冷媒配管・ドレン・電線・化粧カバー・スリーブ・コーキングをセットで拾う"]},
{id:"ghp", name:"GHP（ガスヒートポンプエアコン）", category:"システム",
 description:"ガスエンジンでコンプレッサーを回すエアコンです。冷媒で熱を運ぶしくみはEHPと同じで、「回す力がガス」なのが違い。\n電気は室外機のファン・制御のための少しだけで済むので、電気の契約容量（基本料金）を小さくできます。エンジンの熱を暖房に使えるので、寒い日も暖房が強く、霜取りで止まりにくいのが特長です。",
 usage_scene:["学校","工場","スーパー","大きい店舗・事務所","電気の容量に余裕が無い建物"],
 pros_cons:{pros:["電気の契約容量が小さく済む（受電設備の増設をしなくてよいことがある）","暖房が強く、霜取りで止まりにくい","停電時に動く機種（発電機付き）もある"],
  cons:["エンジンのため定期点検（オイル・プラグ交換など）が必要・費用がかかる","室外機が大きく重い（基礎・搬入を確認）","ガス配管工事が別に要る"]},
 electrical_spec:{power:"室外機：単相200V または 三相200V（ファン・制御用なので小さい。多くは 2.0mm・20A 程度）。発電機付きは機種ごとに確認",
  inter_unit:"室内機は別電源のことが多い（単相200V・VVF 2.0mm-2芯 を渡り配線）",
  transmission:"室外機〜室内機の伝送線：メーカー指定（シールド付き 1.25mm²-2芯 など）",
  remote:"2芯（メーカー指定・例 VCTF 0.75〜1.25mm²）",
  breaker:"室外機 20A 程度・室内機の電源回路 20A（台数で回路を分ける）",
  notes:["ガス配管（ガス会社・ガス工事業者）との取り合いを確認","室内機の電源と室外機の電源は別のブレーカーになることが多い"]},
 material_notes:["ガス配管・ガスメーターの容量確認（ガス工事は資格・業者が別）","室外機の基礎（重い）・防振架台・搬入経路（クレーン）","冷媒配管はビルマルと同じく分岐管が要る機種が多い"]},
{id:"pckg_general", name:"パッケージエアコン（店舗・オフィス用）", category:"システム",
 description:"室外機1台に室内機1台（または同時に動く2〜4台）をつなぐ、店舗・事務所用のエアコンです。ルームエアコンより大きい能力（P40〜P280＝1.5〜10馬力くらい）で、天井カセット・天吊・壁掛・床置など形を選べます。",
 usage_scene:["店舗","事務所","飲食店","クリニック","小さい工場・倉庫"],
 pros_cons:{pros:["1対1なので故障しても他の部屋に影響しない","工事がビルマルより簡単・早い","形・能力を部屋に合わせやすい"],
  cons:["部屋ごとに室外機が要るので、室外機の置き場所が増える","部屋ごとの細かい温度管理はビルマルより苦手"]},
 electrical_spec:{power:"三相200V 動力が基本（小さい機種は単相200Vもある）。能力で電線が変わる：P40〜P80＝2.0mm〜3.5sq・P112＝3.5sq・P140〜P160＝5.5sq・P224＝8sq・P280＝14sq（目安）",
  inter_unit:"VVF 1.6〜2.0mm-3芯（室外機から室内機へ電源と信号を一緒に送る＝S1・S2・S3）。長さはメーカーの上限まで",
  transmission:"同時マルチ（2〜4台）は室内機どうしの渡り線も同じ3芯",
  remote:"2芯（極性なし）：VCTF 0.3〜1.25mm² など。リモコン線の長さの上限に注意（多くは 200〜500m）",
  breaker:"漏電遮断器：P40〜P80＝20A／P112〜P160＝30A／P224＝40〜50A／P280＝60A（目安）",
  notes:["三相の相（R・S・T）を逆にすると動かない・異音の機種がある","内外接続線は電源線と兼ねているので、細すぎると室内機が動かない"]},
 material_notes:["冷媒配管：ガス管・液管のサイズは能力で決まる（例 P80＝φ15.88／φ9.52）","ドレン配管 VP25（天カセはドレンアップ高さを確認）","室外機の架台・防振ゴム・アンカー","動力の電線・漏電遮断器・接地線"]},
{id:"bldg_multi", name:"ビル用マルチエアコン（ビルマル）", category:"システム",
 description:"室外機1台（または数台を連結）に、たくさんの室内機をつなぐ方式です。部屋ごとに運転・温度を変えられ、中央でまとめて管理できます。冷媒配管は分岐管で枝分かれさせて各室内機へ配ります。\nEHP（電気）のビルマルと、GHP（ガス）のマルチがあります。",
 usage_scene:["事務所ビル","ホテル","病院","学校","マンションの共用部"],
 pros_cons:{pros:["室外機の台数が少なく、屋上などにまとめて置ける","部屋ごとに運転・温度を変えられる","集中管理（中央リモコン・ビル管理）がしやすい"],
  cons:["冷媒配管が長く、分岐管・冷媒の追加充てん量の計算が要る","伝送線のつなぎ間違い（アドレス）でトラブルになりやすい","1台の室外機が止まると、つないだ室内機が全部止まる"]},
 electrical_spec:{power:"室外機：三相200V 動力（8〜20馬力で 8sq〜38sq 以上になる。連結は台数分）。室内機：単相200V の別電源（VVF 2.0mm-2芯 で渡り配線・1回路あたりの台数をメーカーで確認）",
  inter_unit:"内外接続線（電源を送る線）は無いことが多い。室内機は別電源",
  transmission:"室外機〜室内機・室内機どうしの伝送線：メーカー指定。例）三菱 M-NET：CVVS（シールド）1.25mm²-2芯／ダイキン VRV：VCTF 0.75〜1.25mm²-2芯（シールド不要の機種あり）。極性なし・渡り配線（いもづる）",
  remote:"室内機〜リモコン：2芯（メーカー指定）。中央リモコンは伝送線につなぐ",
  breaker:"室外機は能力に合わせた漏電遮断器、室内機は単相200V 20A を回路ごと",
  notes:["伝送線は電源線と30cm以上離す（ノイズで誤動作する）。シールド線はシールドを片側で接地","伝送線を電源線とまちがえて接続すると基板が壊れる"]},
 material_notes:["分岐管（分岐継手・ヘッダー）が必ず要る。分岐の場所ごとにサイズを拾う","冷媒の追加充てん量（液管の長さ×サイズごとの量）を計算","室内機ごとのドレン・点検口・吊りボルト","伝送線のアドレス設定表（どの室内機がどの番号か）を作る"]},
{id:"central", name:"セントラル空調（チラー＋AHU／FCU）", category:"システム",
 description:"熱源機（チラー・ボイラー）で冷水・温水を作り、ポンプで建物中へ配って、各部屋の空調機（AHU＝エアハンドリングユニット、FCU＝ファンコイルユニット）で風にして出す方式です。冷媒ではなく「水」で熱を運ぶのが特長。大きいビル・病院・工場で使います。",
 usage_scene:["大きいビル","病院","大学","工場","ホール・劇場"],
 pros_cons:{pros:["大きい建物をまとめて効率よく空調できる","外気の取り入れ・湿度管理（加湿・除湿）がしやすい","冷媒の量が少なく済む"],
  cons:["設備が大きく、工事費・設計の手間がかかる","水配管・ポンプ・自動制御など工種が多い","部屋ごとの細かい運転はFCU次第"]},
 electrical_spec:{power:"チラー：三相200V または 400V（大きい・CV 22sq〜100sq 以上も）。AHU：ファン・ポンプのモーターごとに三相200V（動力制御盤から）。FCU：単相100V／200V（VVF 1.6〜2.0mm-2芯）",
  inter_unit:"冷媒の内外接続線は無い（水配管でつながる）",
  transmission:"自動制御（温度センサー・バルブ・ダンパー）：CVV-S 1.25mm² など計装用ケーブル（自動制御業者の指定）",
  remote:"FCU：3速スイッチ・サーモへの制御線（CVV 1.25mm² など）",
  breaker:"動力制御盤（MCC）で機器ごとに配線用遮断器・電磁開閉器",
  notes:["電気・自動制御・配管の取り合いが多い。設計図の機器表・単線結線図を必ず確認"]},
 material_notes:["冷温水配管（SGP・白ガス管・ステンレス）・保温・バルブ・ストレーナー","ポンプ・膨張タンク・空気抜き","AHUのダクト・ダンパー・フィルター","FCUのドレン（結露水）と二方弁・三方弁"]},
{id:"watercooled_pckg", name:"水冷式パッケージエアコン", category:"システム",
 description:"室外機の代わりに、冷却塔（クーリングタワー）の水で冷媒を冷やすパッケージエアコンです。本体は室内（機械室）に置き、屋上の冷却塔と冷却水配管でつなぎます。",
 usage_scene:["室外機を置けない建物","古いビル","工場","電算室"],
 pros_cons:{pros:["室外機が要らない（冷却塔だけ屋上に置く）","外気温の影響を受けにくい"],
  cons:["冷却塔・冷却水ポンプ・水処理（スケール・レジオネラ対策）が要る","水を使うので維持管理の手間がかかる"]},
 electrical_spec:{power:"本体：三相200V 動力（能力で 3.5sq〜14sq 以上）。冷却塔のファン・冷却水ポンプにも三相200V の電源が別に要る",
  inter_unit:"冷媒の内外接続線は無い（本体の中で完結）",
  transmission:"冷却塔・ポンプとの連動（インターロック）配線：CVV 1.25〜2.0mm²",
  remote:"2芯（メーカー指定）",
  breaker:"本体・冷却塔・ポンプそれぞれに漏電遮断器",
  notes:["冷却水ポンプが止まったら本体を止める連動を必ず入れる"]},
 material_notes:["冷却水配管（SGP など）・保温は凍結する所だけ","冷却塔の基礎・補給水・排水","水処理装置・ストレーナー"]},
{id:"special_ac", name:"設備用・特殊空調（精密・低温・クリーンルーム）", category:"システム",
 description:"人のためではなく、機械・品物・作業のために温度や湿度を細かく保つエアコンです。サーバー室の精密空調（1年中冷房）、冷蔵・冷凍倉庫の低温空調、ほこりを嫌う工場のクリーンルーム空調などがあります。",
 usage_scene:["サーバー室・電算室","冷蔵・冷凍倉庫","食品工場","半導体・薬品工場","研究所・病院の手術室"],
 pros_cons:{pros:["温度・湿度を細かく保てる（±1℃ など）","1年中・24時間の運転に強い"],
  cons:["機器が高い・専門の設計が要る","止まると被害が大きいので予備機（バックアップ）が要る"]},
 electrical_spec:{power:"三相200V または 400V 動力。加湿器・再熱ヒーター付きは電流が大きい（CV 14sq〜38sq 以上になることも）",
  inter_unit:"機種ごと（メーカー指定）",
  transmission:"監視盤・ビル管理への警報・運転信号：CVV-S 1.25mm² など",
  remote:"専用コントローラー（メーカー指定）",
  breaker:"機器ごとに専用の遮断器。予備機は別回路にする",
  notes:["停電・故障の警報を必ず監視盤へ","ヒーター付きは単相負荷のバランスにも注意"]},
 material_notes:["加湿給水・排水（ドレンが多い）","床下吹出しのサーバー室は二重床・床吹出口","低温は冷媒配管の保温を厚く（結露・凍結）"]},
{id:"spot_cooler", name:"スポットエアコン（スポットクーラー）", category:"システム",
 description:"本体1台に冷やす部分と熱を出す部分が入った、置くだけのエアコンです。ダクトで人のいる所だけに冷風を当てます。冷媒配管の工事が要りません。",
 usage_scene:["工場のライン","厨房","倉庫","イベント会場","サーバー室の応急"],
 pros_cons:{pros:["工事がほぼ要らない（コンセントにさすだけの機種も）","移動できる"],
  cons:["部屋全体は冷えない（熱い排気が出る）","ドレンタンクの水捨てか排水が要る"]},
 electrical_spec:{power:"小形：単相100V コンセント（15A・専用が望ましい）。大形：三相200V（プラグ付き・動力コンセント 20A〜30A）",
  inter_unit:"無し",transmission:"無し",remote:"本体の操作部（リモコン付きもある）",
  breaker:"単相100V 15〜20A／三相200V 20〜30A（機種の銘板で確認）",
  notes:["延長コードは太い物（VCT 2.0mm²以上）で短く。細い延長コードは発熱する"]},
 material_notes:["排気ダクト（熱い空気を外へ）","ドレン排水ホース","動力コンセント（大形）"]},

/* ===================== 2. 室内機の形・吹き出し方式 ===================== */
{id:"cassette_4way", name:"天井カセット形 4方向（標準・小形コンパクト）", category:"形状",
 description:"天井に埋め込み、パネルの4方向から風を出す、いちばんよく使う形です。部屋の真ん中に1台置けば全体に風が届きます。小さい部屋用に600角（天井ボード1枚分）のコンパクト形もあります。",
 usage_scene:["事務所","店舗","教室","待合室"],
 pros_cons:{pros:["部屋全体にむらなく風が届く","天井に収まり目立たない","ドレンポンプ内蔵でドレンアップできる"],
  cons:["天井の中に本体の高さ分（約250〜300mm）の空間が要る","天井開口・補強が要る"]},
 electrical_spec:{power:"室外機から内外接続線で電源を送る機種が多い（パッケージ）。ビルマルは室内機に単相200V の別電源（VVF 2.0mm-2芯）",
  inter_unit:"パッケージ：VVF 1.6〜2.0mm-3芯",transmission:"ビルマル：伝送線（メーカー指定）",remote:"2芯（メーカー指定）",
  breaker:"室外機側（パッケージ）／室内機の電源回路 20A（ビルマル）",
  notes:["パネルの電線（ルーバーのモーター）をつなぎ忘れない"]},
 material_notes:["吊りボルト W3/8（全ねじ）4本・ナット・ワッシャー・インサートかアンカー","天井開口（例 標準 860〜890角・コンパクト 580〜600角）と天井補強","ドレン VP25・ドレンアップの高さ（多くは天井から 500〜850mm 以内）・勾配 1/100","点検口は不要な機種が多い（パネルを外して点検）"]},
{id:"cassette_2way_1way", name:"天井カセット形 2方向・1方向", category:"形状",
 description:"細長い部屋や、壁ぎわ・窓ぎわに置く時に向く天井カセットです。2方向は両側へ、1方向は片側へ風を出します。1方向は天井の中の高さが低い所にも入る薄い機種があります。",
 usage_scene:["細長い事務所","廊下ぎわ","窓ぎわ","ホテルの客室"],
 pros_cons:{pros:["細長い部屋・壁ぎわに合う","1方向は天井の中が狭くても入る機種がある"],
  cons:["4方向より風の届く範囲がかたよる"]},
 electrical_spec:{power:"4方向と同じ（パッケージ＝室外から送り／ビルマル＝単相200V 別電源）",
  inter_unit:"VVF 1.6〜2.0mm-3芯",transmission:"ビルマル：伝送線",remote:"2芯（メーカー指定）",breaker:"4方向と同じ",notes:[]},
 material_notes:["吊りボルト W3/8 4本","天井開口は機種ごとに長方形（外形図で確認）","ドレン VP25・ドレンアップ"]},
{id:"ceiling_suspended", name:"天井吊形（天吊形）", category:"形状",
 description:"天井から吊り下げる形です。天井に埋め込まないので、天井の中が狭い・天井が無い（コンクリートむき出し）所でも付けられます。風を遠くまで飛ばせるので、広い店舗や天井の高い所に向きます。",
 usage_scene:["飲食店","店舗","工場","天井の中が狭い所"],
 pros_cons:{pros:["天井開口が要らない・工事が早い","風が遠くまで届く"],
  cons:["本体が見える","ドレンは自然勾配が基本（ドレンアップはオプションの機種が多い）"]},
 electrical_spec:{power:"パッケージ：室外から送り／ビルマル：単相200V 別電源",inter_unit:"VVF 1.6〜2.0mm-3芯",transmission:"ビルマル：伝送線",remote:"2芯（メーカー指定）",breaker:"天カセと同じ",notes:[]},
 material_notes:["吊りボルト W3/8 4本（本体の重さに合うアンカー）","ドレンは自然勾配 1/100 が取れるか確認（取れない時はドレンアップキット）","化粧配管カバー（見える所）"]},
{id:"wall_mounted", name:"壁掛形", category:"形状",
 description:"ルームエアコンと同じく壁に掛ける形です。パッケージ・ビルマルにもあります。工事が簡単で、天井の工事ができない所に向きます。",
 usage_scene:["住宅","小さい事務所","サーバー室","改修工事"],
 pros_cons:{pros:["工事が簡単・安い","天井の中の空間が要らない"],cons:["大きい能力が少ない","風がかたよりやすい"]},
 electrical_spec:{power:"ルーム：単相100V／200V 専用回路（VVF 2.0mm-2芯＋接地・20A）。パッケージ：室外から送り",
  inter_unit:"VVF 1.6〜2.0mm-3芯（ルームは多くが 2.0mm-3芯 指定）",transmission:"ビルマル：伝送線",remote:"ルーム：ワイヤレス。業務用：2芯",
  breaker:"ルーム：20A 専用",notes:["ルームエアコンの電源コンセントは形（100V 15A・20A／200V 15A・20A）が機種ごとに違う"]},
 material_notes:["据付板・壁の補強（下地）","壁の穴 φ65〜75・スリーブ・パテ","化粧カバー（配管テープ巻きか化粧カバーか）","ドレンホース（自然勾配）"]},
{id:"floor_standing", name:"床置形（ダクトなし）", category:"形状",
 description:"床に置く背の高い形です。下から空気を吸って上から強く吹き出します。天井の工事ができない所や、大きい能力が要る所に向きます。",
 usage_scene:["工場","店舗","ホール","機械室"],
 pros_cons:{pros:["天井工事が要らない","大きい能力がある・点検しやすい"],cons:["床の場所を取る","人に風が直接当たりやすい"]},
 electrical_spec:{power:"パッケージ：室外から送り（大きい機種は室内機に別電源のこともある）",inter_unit:"VVF 1.6〜2.0mm-3芯",transmission:"ビルマル：伝送線",remote:"2芯（本体に付いている機種も）",breaker:"機種ごと",notes:[]},
 material_notes:["転倒防止金具（地震対策・壁か床に固定）","ドレンは床の排水へ（トラップ）","配管は本体の下か後ろから"]},
{id:"duct_type", name:"天井埋込ダクト形・床置ダクト形", category:"形状",
 description:"本体を天井の中（または機械室の床）に隠し、ダクトでつないだ吹出口・吸込口から風を出す形です。本体が見えないので、ホテル・おしゃれな店舗・住宅で使います。",
 usage_scene:["ホテルの客室","住宅","デザインを重視する店舗","大部屋（床置ダクト）"],
 pros_cons:{pros:["本体が見えない・吹出口を好きな場所に置ける","静か"],
  cons:["ダクト・吹出口・点検口の工事が要る","ダクトが長いと風量が落ちる（機外静圧を確認）"]},
 electrical_spec:{power:"パッケージ：室外から送り／ビルマル：単相200V 別電源",inter_unit:"VVF 1.6〜2.0mm-3芯",transmission:"ビルマル：伝送線",remote:"2芯（メーカー指定）",breaker:"機種ごと",notes:["静圧の切りかえ（ダクトの長さに合わせる）を本体の設定でする"]},
 material_notes:["吊りボルト W3/8 4本・防振吊り金具","ダクト（スパイラル・フレキ・保温付き）・吹出口・吸込口・チャンバー","点検口 450角または600角（本体・ドレンポンプの点検用）","ドレン VP25・ドレンアップ"]},
{id:"kitchen_ac", name:"厨房用エアコン", category:"形状",
 description:"油煙・湯気・高温の厨房のための天吊形エアコンです。油に強いフィルター・塗装で、油がたまっても掃除しやすくできています。",
 usage_scene:["飲食店の厨房","給食室","食品工場"],
 pros_cons:{pros:["油・湯気に強い・掃除しやすい","高い室温でも冷やせる"],cons:["ふつうの機種より高い","フィルター掃除をこまめにしないと能力が落ちる"]},
 electrical_spec:{power:"パッケージ：室外から送り（三相200V 動力が多い）",inter_unit:"VVF 1.6〜2.0mm-3芯（油に強い電線管・ケーブルで保護）",transmission:"無し（パッケージ）",remote:"2芯（リモコンは厨房の外に置くことが多い）",breaker:"機種ごと",notes:["水がかかる所の電線はPF管などで保護"]},
 material_notes:["耐油の部材（ダクトがある時は耐油・耐熱の指定）","ドレンは自然勾配（油が混じる・つまりやすいので掃除口）","レンジフードの排気と給気（外気）のバランスを確認"]},
{id:"builtin", name:"ビルトイン形", category:"形状",
 description:"天井の中に本体を組み込み、吹出口と吸込口だけを天井に出す形です。ハウジング用（住宅・ホテル）に多く、本体を隠しつつダクト工事を短くできます。",
 usage_scene:["住宅","ホテルの客室","マンション"],
 pros_cons:{pros:["本体が見えない・すっきり","ダクト形よりダクトが短く済む"],cons:["点検口が要る","天井の中の高さ（約230mm〜）と開口の位置が決まっている"]},
 electrical_spec:{power:"多くは室外機から送り（単相200V・ハウジングエアコン）",inter_unit:"VVF 2.0mm-3芯（S1・S2・S3）",transmission:"システムマルチは機種ごと",remote:"2芯（メーカー指定）",breaker:"室外機側 20A（単相200V）",notes:[]},
 material_notes:["吊りボルト W3/8 4本","吹出口・吸込口のパネル（グリル）とダクト（短い）","点検口（本体・電気品箱の点検用）","ドレン VP20〜25"]},

/* ===================== 3. 換気・熱源・周辺機器 ===================== */
{id:"erv", name:"全熱交換器（ロスナイ・ベンティエール等）", category:"関連設備",
 description:"換気をしながら、出ていく空気の熱と湿気を入ってくる外気に移して、エアコンの負担を減らす換気扇です。ロスナイ（三菱）・ベンティエール（ダイキン）などの名前で呼ばれます。エアコンではないので冷暖房はしません。",
 usage_scene:["事務所","教室","店舗","病院","換気の決まりがある建物"],
 pros_cons:{pros:["換気しても部屋が暑く・寒くなりにくい（省エネ）","エアコンと連動して動かせる"],cons:["フィルター・熱交換の部品の掃除が要る","ダクト・外壁のフードの工事が要る"]},
 electrical_spec:{power:"単相100V（小さい物）または 単相200V（大きい物）。VVF 1.6〜2.0mm-2芯",
  inter_unit:"無し",transmission:"エアコンと連動する時は、エアコンの伝送線・連動線につなぐ（メーカー指定）",
  remote:"専用スイッチ 2芯（メーカー指定）",breaker:"20A（台数で回路を分ける）",notes:["エアコンのリモコンで一緒に動かす時は連動の設定と配線を確認"]},
 material_notes:["ダクト φ100〜250（SA 給気・RA 還気・OA 外気・EA 排気の4本）","屋外フード（ベントキャップ）・防火ダンパー（防火区画を貫通する所）","点検口 450角または600角（メンテナンス側の下）","吊りボルト W3/8 4本"]},
{id:"air_curtain", name:"エアカーテン", category:"関連設備",
 description:"出入口の上から下へ強い風を吹き下ろして、外の空気・虫・ほこりが入るのを防ぐ装置です。冷暖房の空気を逃がさないので、出入口の多い店舗で省エネになります。",
 usage_scene:["店舗の出入口","工場の搬入口","冷蔵倉庫の扉","飲食店"],
 pros_cons:{pros:["扉を開けたままでも冷暖房が逃げにくい","虫・ほこりの侵入を減らす"],cons:["音が出る","出入口の幅に合わせて台数が要る"]},
 electrical_spec:{power:"単相100V（小形）・単相200V・三相200V（大形）。VVF 1.6〜2.0mm-2芯（三相は3芯）",
  inter_unit:"無し",transmission:"無し",remote:"スイッチ・ドアスイッチ（扉と連動）の制御線",breaker:"機種ごと（15〜20A が多い）",notes:["扉と連動する時はドアスイッチの配線を追加"]},
 material_notes:["取付金具・下地（出入口の上の壁）","ドアスイッチ・連動の配線"]},
{id:"oa_unit", name:"外気処理エアコン（外調機・OAユニット）", category:"関連設備",
 description:"外から取り入れる空気（外気）を、部屋に入れる前に冷やしたり温めたり、湿度を整えたりするエアコンです。換気で入る外気の負担を引き受けるので、部屋のエアコンが楽になります。",
 usage_scene:["事務所ビル","病院","学校","人の多い部屋"],
 pros_cons:{pros:["換気しても部屋の温度・湿度がくずれにくい","加湿・除湿ができる機種がある"],cons:["機器が大きい・高い","ダクト工事が大きい"]},
 electrical_spec:{power:"三相200V 動力（能力で 3.5sq〜14sq 以上）。加湿器付きは単相200V の別電源が要る機種も",
  inter_unit:"ビルマル系はビルマルと同じ（室内機の別電源）",transmission:"ビルマル系：伝送線（メーカー指定）",remote:"2芯（メーカー指定）",breaker:"機種ごと",notes:[]},
 material_notes:["外気ダクト・防虫網・フード・防火ダンパー","加湿給水（給水配管）とドレン","点検口（加湿器・フィルター）"]},
{id:"radiant", name:"放射空調（天井放射・床放射）", category:"関連設備",
 description:"天井や床に冷水・温水の配管（パネル）を入れて、その面から伝わる熱（放射）で冷暖房する方式です。風が少なく静かで、体にやさしい空調です。床暖房もこの仲間です。",
 usage_scene:["高級な事務所","病院","住宅（床暖房）","美術館"],
 pros_cons:{pros:["風が少なく静か・ほこりが舞いにくい","温度むらが少ない"],cons:["温まる・冷えるまで時間がかかる","冷房は結露に注意（除湿の空調と組み合わせる）","工事費が高い"]},
 electrical_spec:{power:"熱源機（ヒートポンプ・ボイラー）とポンプ：単相200V または 三相200V",
  inter_unit:"無し（水配管）",transmission:"温度センサー・バルブの制御線（CVV 1.25mm² など）",remote:"専用コントローラー",breaker:"熱源機・ポンプごと",notes:["電気式の床暖房は単相200V・専用回路（容量が大きい）"]},
 material_notes:["放射パネル・架橋ポリエチレン管・ヘッダー","断熱材（床・天井）","除湿用の空調（冷房時）"]},
{id:"thermal_storage", name:"蓄熱式空調（氷蓄熱システムなど）", category:"関連設備",
 description:"電気の安い夜間に氷（または冷水・温水）を作ってためておき、昼間にその冷たさ・暖かさで空調する方式です。昼間の電気の使用量（ピーク）を下げられます。",
 usage_scene:["事務所ビル","商業施設","病院","工場"],
 pros_cons:{pros:["昼間の電気のピークを下げられる（契約電力・電気代を下げる）","夜間の安い電気を使える"],cons:["蓄熱槽の場所・重さ（構造）が要る","設備が大きく工事費が高い"]},
 electrical_spec:{power:"三相200V 動力（熱源機は大きい・CV 14sq〜38sq 以上も）。夜間電力の契約・時間帯の制御",
  inter_unit:"氷蓄熱ビルマルはビルマルと同じ（室内機は別電源）",transmission:"ビルマル系：伝送線（メーカー指定）",remote:"2芯（メーカー指定）",breaker:"機種ごと",notes:["時間で運転を切りかえる制御（タイマー・デマンド）を確認"]},
 material_notes:["蓄熱槽（ユニット）の基礎・重さ・給排水","冷媒配管はビルマルと同じく分岐管・追加充てん"]}
];

/* 三相200V 動力の電線の目安（パッケージエアコン・こう長 30m くらいまで。長い・まとめて通す時は太く） */
const powerCableGuide = [
 {cap:"P40〜P56（1.5〜2馬力）", wire:"2.0mm（VVF・VVR）／CV 2sq", br:"20A"},
 {cap:"P63〜P80（2.5〜3馬力）", wire:"2.0mm〜CV 3.5sq", br:"20A"},
 {cap:"P112（4馬力）", wire:"CV 3.5sq", br:"30A"},
 {cap:"P140〜P160（5〜6馬力）", wire:"CV 5.5sq", br:"30〜40A"},
 {cap:"P224（8馬力）", wire:"CV 8sq", br:"40〜50A"},
 {cap:"P280（10馬力）", wire:"CV 14sq", br:"60A"},
 {cap:"ビルマル 12〜20馬力", wire:"CV 14sq〜38sq", br:"75〜125A"}
];
window.airConditionerMaster = airConditionerMaster; window.powerCableGuide = powerCableGuide;

/* ===== 画面：機器の画面（kiki.html）に「📘 空調の種類と電線」ボタンと、分類ごとの説明（開け閉め） ===== */
(function(){
 if (typeof document === "undefined") return;
 const css = `#ksBtn{width:100%;height:46px;border-radius:12px;border:1.5px solid var(--acc,#0369a1);background:var(--card,#fff);color:var(--acc,#0369a1);font:inherit;font-weight:800;font-size:15px;margin:0 0 8px}
#ksOv{position:fixed;inset:0;z-index:50;background:var(--bg,#eef3f7);overflow:auto;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top,0px) + 8px) 12px calc(env(safe-area-inset-bottom,0px) + 24px)}
#ksOv[hidden]{display:none}
#ksOv .ksTop{position:sticky;top:-8px;background:var(--bg,#eef3f7);padding:4px 0 8px;z-index:2}
#ksOv .ksH{display:flex;align-items:center;gap:8px}#ksOv .ksH b{flex:1;font-size:17px}
#ksOv .ksX{height:40px;border-radius:10px;border:1.5px solid var(--line,#c9d5e0);background:var(--card,#fff);color:var(--ink,#0f172a);font:inherit;font-weight:800;padding:0 14px}
#ksOv .ksTabs{display:flex;gap:6px;margin-top:8px}#ksOv .ksTabs button{flex:1;height:38px;border-radius:10px;border:1.5px solid var(--line,#c9d5e0);background:var(--card,#fff);color:var(--ink,#0f172a);font:inherit;font-weight:800;font-size:13.5px}
#ksOv .ksTabs button.on{background:var(--acc,#0369a1);color:#fff;border-color:var(--acc,#0369a1)}
#ksOv input{width:100%;height:42px;border-radius:10px;border:1.5px solid var(--line,#c9d5e0);background:var(--card,#fff);color:var(--ink,#0f172a);font:inherit;font-size:16px;padding:0 10px;margin-top:8px}
#ksOv details{background:var(--card,#fff);border:1.5px solid var(--line,#c9d5e0);border-radius:14px;margin-top:8px;overflow:hidden}
#ksOv summary{list-style:none;padding:12px;font-weight:800;font-size:16px;cursor:pointer;display:flex;align-items:center;gap:8px}#ksOv summary::-webkit-details-marker{display:none}
#ksOv summary:after{content:"▼";margin-left:auto;font-size:12px;color:var(--sub,#5b6b7e)}#ksOv details[open] summary:after{content:"▲"}
#ksOv .ksB{padding:0 12px 12px;font-size:14.5px;line-height:1.65}
#ksOv .ksB h4{font-size:13.5px;margin:12px 0 4px;color:var(--acc,#0369a1)}
#ksOv .ksB ul{margin:0;padding-left:1.2em}#ksOv .ksB p{margin:0;white-space:pre-line}
#ksOv .ksTag{display:inline-block;font-size:12px;border:1px solid var(--line,#c9d5e0);border-radius:999px;padding:1px 8px;margin:2px 4px 2px 0;color:var(--sub,#5b6b7e)}
#ksOv table{width:100%;border-collapse:collapse;font-size:13.5px}#ksOv td{border-top:1px solid var(--line,#c9d5e0);padding:6px 4px;vertical-align:top}#ksOv td:first-child{white-space:nowrap;font-weight:800;width:1%}
#ksOv .ksPro li::marker{content:"○ "}#ksOv .ksCon li::marker{content:"△ "}
#ksOv .ksWarn{font-size:12.5px;color:var(--sub,#5b6b7e);background:var(--card,#fff);border:1.5px dashed var(--line,#c9d5e0);border-radius:12px;padding:8px 10px;margin-top:8px;line-height:1.6}`;
 const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
 const li = a => (a || []).map(x => `<li>${esc(x)}</li>`).join("");
 const card = d => { const e = d.electrical_spec || {}, row = (k, v) => v ? `<tr><td>${k}</td><td>${esc(v)}</td></tr>` : "";
  return `<details id="ks_${d.id}"><summary>${esc(d.name)}</summary><div class="ksB"><p>${esc(d.description)}</p>
   <h4>🏢 主な使い道・置く場所</h4><div>${(d.usage_scene || []).map(x => `<span class="ksTag">${esc(x)}</span>`).join("")}</div>
   <h4>👍 よい所・👎 気をつける所</h4><ul class="ksPro">${li(d.pros_cons && d.pros_cons.pros)}</ul><ul class="ksCon">${li(d.pros_cons && d.pros_cons.cons)}</ul>
   <h4>⚡ 電線・配線の目安</h4><table>${row("電源", e.power)}${row("内外接続線", e.inter_unit)}${row("伝送線", e.transmission)}${row("リモコン線", e.remote)}${row("ブレーカー", e.breaker)}</table>${e.notes && e.notes.length ? `<ul>${li(e.notes)}</ul>` : ""}
   <h4>🧾 材料拾い・見積もりのコツ</h4><ul>${li(d.material_notes)}</ul></div></details>`; };
 const guide = () => `<details id="ks_power"><summary>⚡ 動力（三相200V）の電線の目安</summary><div class="ksB"><table><tr><td>能力</td><td><b>電線</b>・ブレーカー（漏電遮断器）</td></tr>${powerCableGuide.map(g => `<tr><td>${esc(g.cap)}</td><td><b>${esc(g.wire)}</b>・${esc(g.br)}</td></tr>`).join("")}</table><ul><li>こう長（電線の長さ）30m くらいまでの目安。長い時・何本もまとめて通す時は1つ太く</li><li>接地線（アース）を忘れずに（D種接地）</li></ul></div></details>`;
 let tab = "システム";
 function list(){ const q = (document.getElementById("ksQ").value || "").trim(), box = document.getElementById("ksL");
  const hit = d => !q || [d.name, d.description, (d.usage_scene || []).join(" "), JSON.stringify(d.electrical_spec), (d.material_notes || []).join(" ")].join(" ").includes(q);
  const A = airConditionerMaster.filter(d => (q || d.category === tab) && hit(d));
  box.innerHTML = (A.length ? A.map(card).join("") : `<div class="ksWarn">「${esc(q)}」は見つかりませんでした</div>`) + (!q && tab === "システム" ? guide() : "");
  document.querySelectorAll("#ksOv .ksTabs button").forEach(b => b.classList.toggle("on", !q && b.dataset.t === tab)); }
 function open(id){ const ov = document.getElementById("ksOv"); ov.hidden = false; document.body.style.overflow = "hidden";
  if (id){ const d = airConditionerMaster.find(x => x.id === id); if (d) tab = d.category; } list();
  if (id){ const el = document.getElementById("ks_" + id); if (el){ el.open = true; setTimeout(() => el.scrollIntoView({block:"start"}), 0); } } }
 function close(){ document.getElementById("ksOv").hidden = true; document.body.style.overflow = ""; }
 function init(){ const anchor = document.getElementById("qr"); if (!anchor || document.getElementById("ksBtn")) return;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  const b = document.createElement("button"); b.id = "ksBtn"; b.textContent = "📘 空調の種類と電線（初心者向け）"; anchor.parentNode.insertBefore(b, anchor);
  const ov = document.createElement("div"); ov.id = "ksOv"; ov.hidden = true; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", "空調の種類と電線");
  ov.innerHTML = `<div class="ksTop"><div class="ksH"><b>📘 空調の種類と電線</b><button class="ksX" id="ksX">✕ 閉じる</button></div>
   <div class="ksTabs">${[["システム","方式"],["形状","室内機の形"],["関連設備","換気・周辺"]].map(([k, n]) => `<button data-t="${k}">${n}</button>`).join("")}</div>
   <input id="ksQ" type="search" placeholder="さがす（例 ビルマル・伝送線・吊りボルト）"></div>
   <div class="ksWarn">⚠️ 電線の太さ・ブレーカーは<b>よくある目安</b>です。メーカー・機種・電線の長さ（電圧降下）・まとめて通す本数で変わります。<b>必ずメーカーの据付説明書と電気の設計図で確定</b>してください（電気工事は電気工事士の資格が要ります）。</div>
   <div id="ksL"></div>`;
  document.body.appendChild(ov);
  b.onclick = () => open(); document.getElementById("ksX").onclick = close;
  ov.querySelector(".ksTabs").onclick = e => { const t = e.target.closest("[data-t]"); if (!t) return; tab = t.dataset.t; document.getElementById("ksQ").value = ""; list(); };
  document.getElementById("ksQ").oninput = list;
  try { const k = new URLSearchParams(location.search).get("kiso"); if (k != null) open(k || null); } catch(e){} }
 window.kisoOpen = open;
 if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
