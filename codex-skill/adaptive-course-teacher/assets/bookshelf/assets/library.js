// 书架首页：读取 books.json，渲染 Paper 风格的书排与书的目录页。编辑这个文件，然后运行 npm run build 生成 assets/library.js。
(() => {
    'use strict';
    const app = document.getElementById('app');
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const EASE = 'cubic-bezier(.2,.8,.2,1)';
    let library = { name: '书架', searchFrom: 12 };
    let books = [];
    let query = '';
    let lastBookId = null;
    const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const byId = (id) => books.find((book) => book.id === id);
    const bookHash = (id) => `#/book/${encodeURIComponent(id)}`;
    const routeId = () => {
        const match = location.hash.match(/^#\/book\/([^/?#]+)/);
        return match ? decodeURIComponent(match[1]) : null;
    };
    // 相对地址拼在这本书的 reader 根地址后；完整网址或以 / 开头的地址原样使用
    function chapterHref(book, chapter) {
        const href = chapter.href;
        if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('/') || !book.reader)
            return href;
        return book.reader.replace(/\/?$/, '/') + href;
    }
    /* ---------- 书脊 ---------- */
    // 书脊、侧面、封面共用的平涂颜色；侧面默认比书脊深一档
    function colorVars(book) {
        const spine = book.spine || {};
        const cover = book.cover || {};
        const color = spine.color || '#e8e2d4';
        return [
            `--spine:${color}`, `--spine-ink:${spine.ink || '#18181b'}`,
            `--side:${spine.side || `color-mix(in srgb, ${color} 78%, #1a1a1a)`}`,
            `--cover-bg:${cover.background || color}`,
        ].join(';');
    }
    function textLength(text) {
        return Array.from(text || '').reduce((n, ch) => n + (/[\x20-\x7e]/.test(ch) ? 0.55 : 1), 0);
    }
    // 去背景的人物图完整显示
    function coverVars(cover) {
        const contain = cover.fit === 'contain';
        return [
            `--fit:${contain ? 'contain' : 'cover'}`, `--pos:${cover.position || '50% 50%'}`,
            `--pad:${contain ? '7% 6% 5% 9%' : '0'}`,
        ].join(';');
    }
    const cssNumber = (name, fallback) => (parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || fallback);
    // 像 Paper：所有书统一显示高度，只保留真实的宽高比例和厚度差别；厚度略微放大，侧面才看得清
    function bookMetrics(book) {
        const H = cssNumber('--book-h', 320);
        const size = book.size || {};
        const scale = H / (size.height || 220);
        return {
            W: Math.round((size.width || 150) * scale),
            H,
            D: Math.round(Math.max(18, (size.thickness || 16) * scale * 1.8)),
        };
    }
    // 书脊：竖排书名；太窄时只留颜色、顶端小图和两侧转折
    function spineHtml(book, w, h) {
        const spine = book.spine || {};
        const author = spine.author ?? (book.author === book.title ? '' : book.author);
        const artH = spine.art ? Math.round(Math.min(w * 1.3, h * 0.22)) : 0;
        const authorSize = Math.max(8, Math.min(12, Math.floor(w * 0.3)));
        const reserve = 26 + (author ? textLength(author) * authorSize + 10 : 0);
        const titleSize = Math.max(8, Math.min(20, Math.floor(w * 0.5), Math.floor((h - artH - reserve) / Math.max(1, textLength(book.title)))));
        const style = [
            `--w:${w}px`, `--h:${h}px`, `--art-h:${artH}px`, `--title-size:${titleSize}px`,
            `--author-size:${authorSize}px`, colorVars(book),
        ].join(';');
        const art = artH
            ? `<img class="spine-art" src="${esc(spine.art)}" alt="" style="object-position:${esc(spine.artPosition || '50% 50%')}">`
            : '';
        return `<span class="spine" style="${esc(style)}">${art}<span class="spine-text">`
            + `<span class="spine-title">${esc(book.title)}</span>`
            + (author ? `<span class="spine-author">${esc(author)}</span>` : '')
            + '</span></span>';
    }
    // 一本书 = 正面封面 + 左侧书脊 + 右侧书页切口 + 顶面，按真实比例搭成 3D 盒子
    function bookHtml(book) {
        const { W, H, D } = bookMetrics(book);
        const cover = book.cover || {};
        const style = [`--cw:${W}px`, `--ch:${H}px`, `--cd:${D}px`, colorVars(book), coverVars(cover)].join(';');
        const label = [book.title + (book.subtitle ? ` ${book.subtitle}` : ''), book.originalTitle, book.author].filter(Boolean).join('，');
        return `<li class="slot"><a class="book" href="${esc(book.directoryUrl || bookHash(book.id))}" data-id="${esc(book.id)}" aria-label="${esc(label)}" draggable="false" style="${esc(style)}">`
            + '<span class="bface front">'
            + (cover.src ? `<img src="${esc(cover.src)}" alt="" draggable="false">` : '')
            + '<span class="hinge"></span></span>'
            + `<span class="bface spine-face">${spineHtml(book, D, H)}</span>`
            + '<span class="bface fore-face"></span><span class="bface top-face"></span><span class="bface wall-shadow"></span>'
            + '</a></li>';
    }
    /* ---------- 书架页：一排正面封面，像 Paper 的手帐列表 ---------- */
    // 简繁（含日文新字体）都折叠成简体再比较：搜“夜汽车”能找到“夜汽車”，搜“韓國”也能找到“韩国”。
    // 对照表由 tools/make_hanzi_fold.py 从 OpenCC 的单字表生成，不要手改。
    // BEGIN hanzi-fold
    const HANZI_PAIRS = '㑯㑔㑳㑇㑶㐹㓨刾㗲𠵾㘚㘎㜄㚯㜏㛣㜢𡞱㠏㟆㠣𫵷㥮㤘㩜㨫㩳㧐㩵擜㺏𤠋䁪𥇢䁻䀥䃮鿎䊷䌶䋙䌺䋚䌻䋹䌿䋻䌾䍦䍠䎱䎬䓣𬜯䙡䙌䜀䜧䝼䞍䡵𫟦䥇䦂䥑鿏䥕𬭯䥱䥾䦛䦶䦟䦷䧢𨸟䮄𫠊䯀䯅䰾鲃䱷䲣䱽䲝䲁鳚䲘鳤䴉鹮丟丢両两並并乗乘乾干亀龟亂乱予豫亙亘亜亚亞亚仏佛仮假伝传佇伫佈布佔占併并來来侖仑価价侶侣侷局俁俣係系俔伣俠侠俥伡俬私倀伥倆俩倈俫倉仓個个們们倖幸倫伦倲㑈倹俭偉伟偑㐽側侧偵侦偽伪傌㐷傑杰傖伧傘伞備备傢家傭佣傯偬傳传傴伛債债傷伤傾倾僂偻僅仅僉佥僑侨僕仆僞伪僤𫢸僥侥僨偾僱雇價价儀仪儁俊儂侬億亿儈侩儉俭儎傤儐傧儔俦儕侪儘尽償偿優优儲储儷俪儸㑩儺傩儻傥儼俨兇凶兌兑児儿兒儿兗兖內内兩两円圆冊册冑胄冪幂凈净凍冻凜凛処处凱凯別别刪删剄刭則则剋克剎刹剗刬剛刚剝剥剣剑剤剂剮剐剰剩剴剀創创剷铲劃划劄札劇剧劉刘劊刽劌刿劍剑劏㓥劑剂劚㔉労劳効效勁劲勅敕動动務务勛勋勝胜勞劳勢势勣𪟝勧劝勩勚勱劢勲勋勳勋勵励勸劝勻匀匭匦匯汇匱匮區区協协単单卹恤卻却卽即厙厍厠厕厤历厭厌厲厉厳严厴厣參参叄叁収收叙敍叢丛吒咤吳吴吶呐呂吕咼呙員员唄呗唖哑唸念問问啓启啞哑啟启啢唡喎㖞喚唤喪丧喫吃喬乔單单喲哟営营嗆呛嗇啬嗊唝嗎吗嗚呜嗩唢嗰𠮶嗶哔嘆叹嘍喽嘓啯嘔呕嘖啧嘗尝嘜唛嘩哗嘮唠嘯啸嘰叽嘵哓嘸呒嘽啴噁恶噓嘘噚㖊噛啮噝咝噠哒噥哝噦哕噯嗳噲哙噴喷噸吨噹当嚀咛嚇吓嚌哜嚐尝嚕噜嚙啮嚥咽嚦呖嚧𠰷嚨咙嚮向嚲亸嚳喾嚴严嚶嘤囀啭囁嗫囂嚣囅冁囈呓囉啰囌苏囑嘱団团囪囱囲围図图圇囵國国圍围圏圈園园圓圆圖图團团圧压垻坝埡垭埨𫭢埰采執执堅坚堊垩堖垴堝埚堯尧報报場场塁垒塊块塋茔塏垲塒埘塗涂塚冢塢坞塤埙塩盐塵尘塸𫭟塹堑塿𪣻墊垫増增墜坠墠𫮃墮堕墰坛墳坟墶垯墻墙墾垦壇坛壊坏壋垱壌壤壎埙壓压壗𡋤壘垒壙圹壚垆壜坛壞坏壟垄壠垅壢坜壩坝壪塆壯壮壱壹売卖壺壶壼壸壽寿変变夠够夢梦夥伙夾夹奐奂奧奥奨奖奩奁奪夺奬奖奮奋奼姹妝妆姍姗姦奸娙𫰛娛娱婁娄婦妇婭娅媧娲媯妫媰㛀媼媪媽妈嫋袅嫗妪嫵妩嫺娴嫻娴嫿婳嬀妫嬃媭嬈娆嬋婵嬌娇嬙嫱嬡嫒嬢娘嬤嬷嬪嫔嬰婴嬸婶孃娘孋㛤孌娈孫孙學学孻𡥧孿孪実实宮宫寀采寛宽寢寝實实寧宁審审寫写寬宽寵宠寶宝対对専专將将專专尋寻對对導导尭尧尷尴屆届屍尸屓屃屜屉屢屡層层屨屦屬属岡冈峯峰峴岘島岛峽峡崍崃崑昆崗岗崙仑崢峥崬岽嵐岚嵗岁嵽𫶇嵾㟥嶁嵝嶄崭嶇岖嶔嵚嶗崂嶠峤嶢峣嶧峄嶨峃嶮崄嶸嵘嶺岭嶼屿嶽岳巋岿巌岩巒峦巔巅巖岩巘𪩘巣巢巰巯巹卺巻卷帥帅師师帯带帰归帳帐帶带幀帧幃帏幓㡎幗帼幘帻幟帜幣币幫帮幬帱幷并幹干幾几庁厅広广庫库廁厕廂厢廃废廄厩廈厦廎庼廕荫廚厨廝厮廞𫷷廟庙廠厂廡庑廢废廣广廩廪廬庐廳厅弁辨弐贰弒弑弔吊弳弪張张強强弾弹彄𫸩彆别彈弹彌弥彎弯彔录彙汇彠彟彥彦彫雕彲彨彿佛後后徑径従从從从徠徕復复徳德徴征徵征徹彻応应恆恒恥耻恵惠悅悦悞悮悩恼悪恶悵怅悶闷悽凄惡恶惱恼惲恽惻恻愛爱愜惬愨悫愴怆愷恺愾忾慄栗態态慍愠慎愼慘惨慚惭慟恸慣惯慤悫慪怄慫怂慮虑慳悭慶庆慺㥪慼戚慾欲憂忧憊惫憐怜憑凭憒愦憖慭憚惮憤愤憫悯憮怃憲宪憶忆懇恳應应懌怿懍懔懐怀懞蒙懟怼懣懑懤㤽懨恹懲惩懶懒懷怀懸悬懺忏懼惧懾慑戀恋戇戆戔戋戦战戧戗戩戬戯戏戰战戱戯戲戏戶户戻戾払拂扞捍抜拔択择拋抛拚拼拝拜拠据拡扩挙擧挩捝挱挲挾挟挿插捜搜捨舍捫扪捱挨捲卷掃扫掄抡掆㧏掗挜掙挣掛挂採采掲揭掻搔揀拣揚扬換换揮挥揯搄揺摇損损搖摇搗捣搧扇搵揾搶抢摂摄摑掴摜掼摟搂摯挚摳抠摶抟摺折摻掺撃击撈捞撏挦撐撑撓挠撝㧑撟挢撣掸撥拨撫抚撲扑撳揿撹搅撻挞撾挝撿捡擁拥擄掳擇择擊击擋挡擓㧟擔担據据擠挤擡抬擣捣擬拟擯摈擰拧擱搁擲掷擴扩擷撷擺摆擻擞擼撸擽㧰擾扰攄摅攆撵攏拢攔拦攖撄攙搀攛撺攜携攝摄攢攒攣挛攤摊攪搅攬揽敎教敓敚敗败敘叙敵敌數数斂敛斃毙斆敩斉齐斎斋斕斓斬斩斷断於于旂旗旣既昇升時时晃晄晉晋晛𬀪晝昼晩晚暁晓暈晕暉晖暐𬀩暘旸暢畅暦历暫暂曄晔曆历曇昙曉晓曏向曖暧曠旷曥𣆐曨昽曬晒書书曽曾會会朥𦛨朧胧朮术東东枴拐柵栅柺拐査查栄荣桜樱桝枡桟栈桱𣐕桿杆梔栀梘枧梜𬂩條条梟枭梲棁棄弃棊棋棖枨棗枣棟栋棡㭎棧栈棲栖棶梾椏桠検检椲㭏楊杨楓枫楨桢業业極极楽乐概槪榘矩榦干榪杩榮荣榲榅榿桤構构槍枪槓杠様样槙槇槤梿槧椠槨椁槮椮槳桨槶椢槼椝樁桩樂乐樅枞樑梁樓楼標标樞枢樢㭤樣样樧榝権权樫㭴樳桪樸朴樹树樺桦樿椫橈桡橋桥機机橢椭橫横橯𣓿檁檩檉柽檔档檜桧檟槚檢检檣樯檮梼檯台檳槟檸柠檻槛櫃柜櫍𬃊櫓橹櫚榈櫛栉櫝椟櫞橼櫟栎櫥橱櫧槠櫨栌櫪枥櫫橥櫬榇櫱蘖櫳栊櫸榉櫻樱欄栏欅榉權权欏椤欒栾欓𣗋欖榄欞棂欠缺欽钦歎叹歐欧歓欢歟欤歡欢歩步歯齿歲岁歳岁歴历歷历歸归歿殁殘残殞殒殤殇殨㱮殫殚殭僵殮殓殯殡殰㱩殲歼殺杀殻壳殼壳毀毁毆殴毎每毿毵氂牦氈毡氌氇気气氣气氫氢氬氩氳氲氾泛汎泛汙污決决沒没沖冲沢泽沪滤況况泝溯洩泄洶汹浄净浜滨浹浃浿𬇙涇泾涗涚涙泪涼凉淒凄淚泪淥渌淨净淩凌淪沦淵渊淶涞淺浅渇渴済济渉涉渋澁渓溪渙涣減减渢沨渦涡測测渾浑湊凑湋𣲗湞浈湧涌湯汤満满溈沩準准溝沟溫温溮浉溳涢溼湿滄沧滅灭滌涤滎荥滙汇滝泷滬沪滯滞滲渗滷卤滸浒滻浐滾滚滿满漁渔漊溇漍𬇹漚沤漢汉漣涟漬渍漲涨漵溆漸渐漿浆潁颍潑泼潔洁潕𣲘潙沩潚㴋潛潜潤润潯浔潰溃潷滗潿涠澀涩澆浇澇涝澐沄澗涧澠渑澤泽澦滪澩泶澫𬇕澮浍澱淀澾㳠濁浊濃浓濄㳡濆𣸣濕湿濘泞濚溁濛蒙濜浕濟济濤涛濧㳔濫滥濰潍濱滨濺溅濼泺濾滤瀂澛瀅滢瀆渎瀇㲿瀉泻瀋沈瀏浏瀕濒瀘泸瀝沥瀟潇瀠潆瀦潴瀧泷瀨濑瀬濑瀰弥瀲潋瀾澜灃沣灄滠灑洒灒𪷽灕漓灘滩灙𣺼灝灏灡㳕灣湾灤滦灧滟灩滟災灾為为烏乌烴烃無无焼烧煉炼煒炜煙烟煢茕煥焕煩烦煬炀煱㶽熅煴熒荧熗炝熰𬉼熱热熲颎熾炽燀𬊤燁烨燈灯燉炖燒烧燖𬊈燙烫燜焖營营燦灿燬毁燭烛燴烩燶㶶燻熏燼烬燾焘爍烁爐炉爛烂爭争爲为爺爷爾尔牀床牆墙牘牍牴抵牽牵犖荦犛牦犠牺犢犊犧牺狀状狹狭狽狈猙狰猟猎猶犹猻狲獁犸獃呆獄狱獅狮獎奖獣兽獨独獪狯獫猃獮狝獰狞獱㺍獲获獵猎獷犷獸兽獺獭獻献獼猕玀猡現现琱雕琺珐琿珲瑋玮瑒玚瑣琐瑤瑶瑩莹瑪玛瑲玱璉琏璊𫞩璕𬍤璗𬍡璡琎璣玑璦瑷璫珰璯㻅環环璵玙璸瑸璽玺璿璇瓅𬍛瓊琼瓏珑瓔璎瓚瓒瓛𤩽瓶甁甌瓯甕瓮產产産产畝亩畢毕畫画異异畳叠畵画當当疇畴疊叠痙痉痠酸痩瘦痾疴瘂痖瘋疯瘍疡瘓痪瘞瘗瘡疮瘧疟瘮瘆瘲疭瘺瘘瘻瘘療疗癆痨癇痫癉瘅癒愈癘疠癟瘪癡痴癢痒癤疖癥症癧疬癩癞癬癣癭瘿癮瘾癰痈癱瘫癲癫発发發发皁皂皚皑皰疱皸皲皺皱盃杯盜盗盞盏盡尽監监盤盘盧卢盪荡県县眞真眥眦眾众睍𪾢睏困睜睁睞睐瞘眍瞜䁖瞞瞒瞶瞆瞼睑矇蒙矓眬矚瞩矯矫研硏砕碎硃朱硜硁硤硖硨砗硯砚碕埼碩硕碭砀碸砜確确碼码碽䂵磑硙磚砖磠硵磣碜磧碛磯矶磽硗磾䃅礄硚礎础礐𬒈礙碍礦矿礪砺礫砾礬矾礱砻祕秘祿禄禍祸禎祯禕祎禡祃禦御禪禅禮礼禰祢禱祷禿秃秈籼稅税稈秆稏䅉稜棱稟禀種种稱称稲稻穀谷穂穗穇䅟穌稣積积穎颖穏稳穠秾穡穑穢秽穣穰穩稳穫获穭穞窩窝窪洼窮穷窯窑窵窎窶窭窺窥竄窜竅窍竇窦竈灶竊窃竜龙竪竖競竞筆笔筍笋筧笕筴䇲箇个箋笺箏筝箚札節节範范築筑篋箧篔筼篠筿篢𬕂篤笃篩筛篳筚篸𥮾簀箦簍篓簑蓑簞箪簡简簣篑簫箫簹筜簽签簾帘籃篮籅𥫣籌筹籔䉤籙箓籛篯籜箨籟籁籠笼籤签籩笾籪簖籬篱籮箩籲吁粋粹粛肃粵粤糉粽糝糁糞粪糧粮糰团糲粝糴籴糶粜糸丝糹纟糾纠紀纪紂纣紃𬘓約约紅红紆纡紇纥紈纨紉纫紋纹納纳紐纽紓纾純纯紕纰紖纼紗纱紘纮紙纸級级紛纷紜纭紝纴紞𬘘紡纺紬䌷紮扎細细紱绂紲绁紳绅紵纻紹绍紺绀紼绋紿绐絀绌終终絃弦組组絅䌹絆绊経经絎绗結结絕绝絛绦絝绔絞绞絡络絢绚給给絨绒絪𬘡絰绖統统絲丝絳绛絵绘絶绝絹绢絺𫄨綁绑綃绡綄𬘫綆绠綈绨綉绣綌绤綎𬘩綏绥綐䌼綑捆經经綖𫄧継继続续綜综綝𬘭綞缍綠绿綡𫟅綢绸綣绻綧𬘯綪𬘬綫线綬绶維维綯绹綰绾綱纲網网綳绷綴缀綵彩綸纶綹绺綺绮綻绽綽绰綾绫綿绵緄绲緇缁緊紧緋绯総总緑绿緒绪緓绬緔绱緗缃緘缄緙缂線线緝缉緞缎締缔緡缗緣缘緦缌編编緩缓緬缅緯纬緱缑緲缈練练緶缏緹缇緻致緼缊縁缘縄绳縈萦縉缙縊缢縋缒縐绉縑缣縕缊縗缞縛缚縝缜縞缟縟缛縣县縦纵縧绦縫缝縭缡縮缩縯𬙂縱纵縲缧縳䌸縴纤縵缦縶絷縷缕縹缥總总績绩繃绷繅缫繆缪繊纤繍绣繒缯織织繕缮繚缭繞绕繡绣繢缋繩绳繪绘繫系繭茧繮缰繯缳繰缲繳缴繶𫄷繸䍁繹绎繻𦈡繼继繽缤繾缱繿䍀纁𫄸纆𬙊纇颣纈缬纊纩續续纍累纏缠纓缨纔才纕𬙋纖纤纘缵纜缆缶罐缽钵罃䓨罈坛罌罂罎坛罰罚罵骂罷罢羅罗羆罴羈羁羋芈羣群羥羟羨羡義义羶膻習习翫玩翬翚翹翘翻飜翽翙耬耧耮耢聖圣聞闻聯联聰聪聲声聳耸聴听聵聩聶聂職职聹聍聽听聾聋肅肃脅胁脈脉脛胫脣唇脩修脫脱脳脑脹胀腎肾腖胨腡脶腦脑腫肿腳脚腸肠膃腽膕腘膚肤膞䏝膠胶膢𦝼膩腻膽胆膾脍膿脓臉脸臍脐臏膑臓脏臘腊臚胪臟脏臠脔臢臜臥卧臨临臺台與与興兴舉举舊旧舖铺舘馆艙舱艤舣艦舰艫舻艱艰艶艳艷艳芸艺芻刍苧苎茲兹荊荆荘庄莊庄莖茎莢荚莧苋華华菴庵菸烟萇苌萊莱萌萠萬万萴荝萵莴葉叶葒荭葤荮葦苇葯药葷荤蒍𫇭蒐搜蒓莼蒔莳蒕蒀蒞莅蒼苍蓀荪蓆席蓋盖蓮莲蓯苁蓴莼蓽荜蔄𬜬蔔卜蔘参蔞蒌蔣蒋蔥葱蔦茑蔭荫蔯𫈟蔵藏蔿𫇭蕁荨蕆蒇蕎荞蕒荬蕓芸蕕莸蕘荛蕢蒉蕩荡蕪芜蕭萧蕷蓣薀蕰薈荟薊蓟薌芗薑姜薔蔷薘荙薟莶薦荐薩萨薫薰薬药薴苧薵䓓薹苔薺荠藍蓝藎荩藝艺藥药藪薮藭䓖藴蕴藶苈藹蔼藺蔺蘀萚蘄蕲蘆芦蘇苏蘊蕴蘋苹蘚藓蘞蔹蘟𦻕蘢茏蘭兰蘺蓠蘿萝虆蔂虉𬟁處处虛虚虜虏號号虧亏虯虬蛍萤蛺蛱蛻蜕蜆蚬蝀𬟽蝋蜡蝕蚀蝟猬蝦虾蝨虱蝸蜗螄蛳螞蚂螢萤螮䗖螻蝼螿螀蟄蛰蟈蝈蟎螨蟣虮蟬蝉蟯蛲蟲虫蟳𫊻蟶蛏蟻蚁蠁蚃蠅蝇蠆虿蠍蝎蠐蛴蠑蝾蠔蚝蠟蜡蠣蛎蠨蟏蠱蛊蠶蚕蠻蛮衆众衊蔑術术衕同衚胡衛卫衝冲袞衮袷夹裊袅裏里補补裝装裡里製制複复褌裈褒襃褘袆褲裤褳裢褸褛褻亵襀𫌀襇裥襉裥襏袯襖袄襝裣襠裆襤褴襪袜襬摆襯衬襲袭襴襕覇霸覈核見见覎觃規规覓觅視视覘觇覚觉覡觋覥觍覦觎覧览親亲覬觊覯觏覲觐観观覷觑覺觉覽览覿觌觀观觴觞觶觯觸触訁讠訂订訃讣計计訊讯訌讧討讨訏𬣙訐讦訒讱訓训訕讪訖讫託托記记訛讹訝讶訟讼訢䜣訣诀訥讷訩讻訪访設设許许訳译訴诉訶诃診诊註注証证詀𧮪詁诂詆诋詎讵詐诈詒诒詔诏評评詖诐詗诇詘诎詛诅詝𬣞詞词詠咏詡诩詢询詣诣試试詩诗詪𬣳詫诧詬诟詭诡詮诠詰诘話话該该詳详詵诜詷𫍣詼诙詿诖誄诔誅诛誆诓誇夸誌志認认誑诳誒诶誕诞誘诱誚诮語语誠诚誡诫誣诬誤误誥诰誦诵誨诲說说説说読读誰谁課课誶谇誹诽誼谊誾訚調调諂谄諄谆談谈諉诿請请諍诤諏诹諑诼諒谅諓𬣡論论諗谂諛谀諜谍諝谞諞谝諟𬤊諡谥諢诨諤谔諦谛諧谐諫谏諭谕諮咨諱讳諲𬤇諳谙諴𫍯諶谌諷讽諸诸諺谚諼谖諾诺謀谋謁谒謂谓謄誊謅诌謊谎謎谜謏𫍲謐谧謔谑謖谡謗谤謙谦謚谥講讲謝谢謠谣謡谣謨谟謫谪謬谬謭谫謳讴謹谨謾谩譁哗證证譎谲譏讥譓𬤝譖谮識识譙谯譚谭譜谱譞𫍽譟噪譫谵譭毁譯译議议譲让譴谴護护譸诪譽誉譾谫讀读讅谉變变讋詟讌䜩讎雠讒谗讓让讕谰讖谶讚赞讜谠讞谳谿溪豈岂豊丰豎竖豐丰豔艳豬猪豶豮貍狸貓猫貙䝙貝贝貞贞貟贠負负財财貢贡貧贫貨货販贩貪贪貫贯責责貯贮貰贳貲赀貳贰貴贵貶贬買买貸贷貺贶費费貼贴貽贻貿贸賀贺賁贲賂赂賃赁賄贿賅赅資资賈贾賊贼賑赈賒赊賓宾賕赇賙赒賚赉賛赞賜赐賞赏賠赔賡赓賢贤賣卖賤贱賦赋賧赕質质賫赍賬账賭赌賰䞐賴赖賵赗賺赚賻赙購购賽赛賾赜贄贽贅赘贇赟贈赠贊赞贋赝贍赡贏赢贐赆贓赃贔赑贖赎贗赝贛赣贜赃赬赪趕赶趙赵趨趋趲趱跡迹踐践踰逾踴踊蹌跄蹕跸蹟迹蹠跖蹣蹒蹤踪蹺跷躂跶躉趸躊踌躋跻躍跃躎䟢躑踯躒跞躓踬躕蹰躚跹躡蹑躥蹿躦躜躪躏軀躯車车軋轧軌轨軍军軏𫐄軑轪軒轩軔轫軛轭軝𬨂軟软転转軤轷軫轸軲轱軸轴軹轵軺轺軻轲軼轶軽轻軾轼較较輄𨐈輅辂輇辁輈辀載载輊轾輋𪨶輒辄輓挽輔辅輕轻輗𫐐輛辆輜辎輝辉輞辋輟辍輥辊輦辇輩辈輪轮輬辌輮𫐓輯辑輳辏輶𬨎輸输輻辐輼辒輾辗輿舆轀辒轂毂轄辖轅辕轆辘轉转轍辙轎轿轔辚轟轰轡辔轢轹轤轳辦办辭辞辮辫辯辩農农辺边迴回逓递逕径這这連连週周進进遅迟遊游運运過过達达違违遙遥遜逊遞递遠远遡溯適适遲迟遶绕遷迁選选遺遗遼辽邁迈還还邇迩邊边邏逻邐逦郎郞郟郏郵邮郷鄕鄆郓鄉乡鄒邹鄔邬鄖郧鄧邓鄩𬩽鄭郑鄰邻鄲郸鄳𫑡鄴邺鄶郐鄺邝酇酂酈郦酔醉醃腌醖酝醜丑醞酝醟蒏醣糖醤酱醫医醬酱醱酦醲𬪩醸酿釀酿釁衅釃酾釅酽釈释釋释釐厘釒钅釓钆釔钇釕钌釗钊釘钉釙钋針针釣钓釤钐釦扣釧钏釩钒釴𬬩釵钗釷钍釹钕釺钎釾䥺釿𬬱鈀钯鈁钫鈃钘鈄钭鈅钥鈇𫓧鈈钚鈉钠鈍钝鈎钩鈐钤鈑钣鈒钑鈔钞鈕钮鈞钧鈡钟鈣钙鈥钬鈦钛鈧钪鈮铌鈰铈鈳钶鈴铃鈷钴鈸钹鈹铍鈺钰鈽钸鈾铀鈿钿鉀钾鉄铁鉅巨鉆钻鉈铊鉉铉鉊𬬿鉋铇鉍铋鉑铂鉕钷鉗钳鉚铆鉛铅鉝𫟷鉞钺鉢钵鉤钩鉥𬬸鉦钲鉧𬭁鉬钼鉭钽鉮𬬹鉱鑛鉳锫鉶铏鉷𫟹鉸铰鉺铒鉻铬鉿铪銀银銃铳銅铜銈𫓯銍铚銑铣銓铨銖铢銘铭銚铫銛铦銜衔銠铑銣铷銥铱銦铟銨铵銩铥銪铕銫铯銬铐銭钱銱铞銳锐銶𨱇銷销銹锈銻锑銼锉鋁铝鋃锒鋅锌鋇钡鋌铤鋏铗鋐𬭎鋒锋鋗𫓶鋙铻鋝锊鋟锓鋣铘鋤锄鋥锃鋦锔鋨锇鋩铓鋪铺鋭锐鋮铖鋯锆鋰锂鋱铽鋳铸鋶锍鋸锯鋹𬬮鋼钢錀𬬭錁锞錄录錆锖錇锫錈锩錏铔錐锥錒锕錕锟錘锤錙锱錚铮錛锛錞𬭚錟锬錠锭錡锜錢钱錤𫓹錦锦錨锚錩锠錫锡錬炼錮锢錯错録录錳锰錶表錸铼錼镎鍀锝鍁锨鍃锪鍅钫鍆钔鍇锴鍈锳鍊炼鍋锅鍍镀鍔锷鍘铡鍚钖鍛锻鍠锽鍤锸鍥锲鍩锘鍬锹鍭𬭤鍰锾鍵键鍶锶鍺锗鍼针鍾钟鎂镁鎄锿鎇镅鎊镑鎌镰鎓𬭩鎔镕鎖锁鎘镉鎚锤鎛镈鎝𨱏鎡镃鎢钨鎣蓥鎦镏鎧铠鎩铩鎪锼鎬镐鎭镇鎮镇鎰镒鎲镋鎳镍鎵镓鎶鿔鎸镌鎿镎鏃镞鏇旋鏈链鏌镆鏍镙鏏𬭬鏐镠鏑镝鏗铿鏘锵鏜镗鏝镘鏞镛鏟铲鏡镜鏢镖鏤镂鏨錾鏰镚鏵铧鏷镤鏹镪鏺䥽鏻𬭸鏽锈鐃铙鐄𨱑鐇𫔍鐋铴鐍𫔎鐏𨱔鐐镣鐒铹鐓镦鐔镡鐘钟鐙镫鐝镢鐠镨鐥䦅鐦锎鐧锏鐨镄鐩𬭼鐫镌鐮镰鐯䦃鐲镯鐳镭鐵铁鐶镮鐸铎鐺铛鐽𫟼鐿镱鑄铸鑊镬鑌镔鑑鉴鑒鉴鑔镲鑕锧鑞镴鑠铄鑣镳鑥镥鑪𬬻鑭镧鑰钥鑱镵鑲镶鑷镊鑹镩鑼锣鑽钻鑾銮鑿凿钁镢钂镋長长門门閂闩閃闪閆闫閈闬閉闭開开閌闶閎闳閏闰閑闲閒闲間间閔闵閘闸閡阂関关閣阁閤合閥阀閨闺閩闽閫阃閬阆閭闾閱阅閲阅閶阊閹阉閻阎閼阏閽阍閾阈閿阌闃阒闆板闇暗闈闱闉𬮱闊阔闋阕闌阑闍阇闐阗闑𫔶闒阘闓闿闔阖闕阙闖闯闘鬭關关闞阚闠阓闡阐闢辟闤阛闥闼陘陉陝陕陞升陣阵陥陷陰阴陳陈陸陆険险陽阳隉陧隊队階阶隑𬮿隕陨際际隠隐隤𬯎隨随險险隮𬯀隯陦隱隐隴陇隸隶隻只雋隽雑杂雖虽雙双雛雏雜杂雞鸡離离難难雲云電电霊灵霑沾霢霡霧雾霽霁靂雳靄霭靆叇靈灵靉叆靚靓靜静靝靔靦腼靨靥鞏巩鞝绱鞦秋鞽鞒韁缰韃鞑韆千韉鞯韋韦韌韧韍韨韓韩韙韪韜韬韝鞲韞韫韻韵響响頁页頂顶頃顷項项順顺頇顸須须頊顼頌颂頍𫠆頎颀頏颃預预頑顽頒颁頓顿頔𬱖頗颇領领頜颌頠𬱟頡颉頤颐頦颏頫𫖯頭头頮颒頰颊頲颋頴颕頵𫖳頷颔頸颈頹颓頻频頼赖頽颓顆颗題题額额顎颚顏颜顒颙顓颛顔颜顕显顗𫖮願愿顙颡顛颠類类顢颟顥颢顧顾顫颤顬颥顯显顰颦顱颅顳颞顴颧風风颭飐颮飑颯飒颱台颳刮颶飓颸飔颺飏颻飖颼飕飀飗飄飘飆飙飈飚飛飞飠饣飢饥飣饤飥饦飩饨飪饪飫饫飭饬飯饭飱飧飲饮飴饴飼饲飽饱飾饰飿饳餃饺餄饸餅饼餈糍餉饷養养餌饵餎饹餏饻餑饽餒馁餓饿餕馂餖饾餗𫗧餘余餚肴餛馄餜馃餞饯餡馅館馆餬糊餱糇餳饧餵喂餶馉餷馇餸𩠌餺馎餼饩餾馏餿馊饁馌饃馍饅馒饈馐饉馑饊馓饋馈饌馔饑饥饒饶饗飨饘𫗴饜餍饞馋饢馕馬马馭驭馮冯馱驮馳驰馴驯馹驲馼𫘜駁驳駃𫘝駅驿駆驱駉𬳶駐驻駑驽駒驹駓𬳵駔驵駕驾駘骀駙驸駛驶駝驼駟驷駡骂駢骈駪𬳽駭骇駰骃駱骆駸骎駼𬳿駿骏騁骋騂骍騄𫘧騅骓騊𫘦騌骔騍骒騎骑騏骐騑𬴂騒骚験验騖骛騙骗騞𬴃騠𫘨騤骙騧䯄騫骞騭骘騮骝騰腾騱𫘬騵𫘪騶驺騷骚騸骟騾骡驀蓦驁骜驂骖驃骠驄骢驅驱驊骅驌骕驍骁驎𬴊驏骣驕骄驗验驚惊驛驿驟骤驢驴驤骧驥骥驦骦驪骊驫骉骯肮髄髓髏髅髒脏體体髕髌髖髋髪发髮发鬆松鬍胡鬚须鬢鬓鬥斗鬧闹鬨哄鬩阋鬮阄鬱郁鬹鬶魎魉魘魇魚鱼魛鱽魟𫚉魢鱾魨鲀魯鲁魴鲂魷鱿魺鲄鮀𬶍鮁鲅鮃鲆鮆𫚖鮈𬶋鮊鲌鮋鲉鮍鲏鮎鲇鮐鲐鮑鲍鮒鲋鮓鲊鮚鲒鮜鲘鮝鲞鮞鲕鮟𩽾鮠𬶏鮡𬶐鮣䲟鮦鲖鮪鲔鮫鲛鮭鲑鮮鲜鮳鲓鮶鲪鮸𩾃鮺鲝鯀鲧鯁鲠鯇鲩鯉鲤鯊鲨鯒鲬鯔鲻鯕鲯鯖鲭鯗鲞鯛鲷鯝鲴鯡鲱鯢鲵鯤鲲鯧鲳鯨鲸鯪鲮鯫鲰鯰鲶鯴鲺鯷鳀鯻𬶟鯽鲫鯿鳊鰁鳈鰂鲗鰃鳂鰆䲠鰈鲽鰉鳇鰊𬶠鰌䲡鰍鳅鰏鲾鰐鳄鰒鳆鰓鳃鰛鳁鰜鳒鰟鳑鰠鳋鰣鲥鰤𫚕鰥鳏鰧䲢鰨鳎鰩鳐鰭鳍鰮鳁鰱鲢鰲鳌鰳鳓鰵鳘鰶𬶭鰷鲦鰹鲣鰺鲹鰻鳗鰼鳛鰾鳔鱀𬶨鱂鳉鱅鳙鱇𩾌鱈鳕鱉鳖鱒鳟鱔鳝鱖鳜鱗鳞鱘鲟鱚𬶮鱝鲼鱟鲎鱠鲙鱣鳣鱤鳡鱧鳢鱨鲿鱭鲚鱯鳠鱲𫚭鱷鳄鱸鲈鱺鲡鳥鸟鳧凫鳩鸠鳬凫鳲鸤鳳凤鳴鸣鳶鸢鳾䴓鴆鸩鴇鸨鴉鸦鴎鸥鴒鸰鴕鸵鴛鸳鴝鸲鴞鸮鴟鸱鴣鸪鴦鸯鴨鸭鴯鸸鴰鸹鴴鸻鴷䴕鴻鸿鴿鸽鵁䴔鵂鸺鵃鸼鵏𬷕鵐鹀鵑鹃鵒鹆鵓鹁鵜鹈鵝鹅鵟𫛭鵠鹄鵡鹉鵪鹌鵬鹏鵮鹐鵯鹎鵰雕鵲鹊鵷鹓鵾鹍鶄䴖鶇鸫鶉鹑鶊鹒鶏鸡鶓鹋鶖鹙鶘鹕鶚鹗鶠𬸘鶡鹖鶥鹛鶩鹜鶪䴗鶬鸧鶯莺鶱𬸣鶲鹟鶴鹤鶹鹠鶺鹡鶻鹘鶼鹣鶿鹚鷀鹚鷁鹢鷂鹞鷄鸡鷉䴘鷊鹝鷓鹧鷖鹥鷗鸥鷙鸷鷚鹨鷟𬸦鷥鸶鷦鹪鷫鹔鷭𬸪鷯鹩鷲鹫鷳鹇鷴鹇鷸鹬鷹鹰鷺鹭鷽鸴鸂㶉鸇鹯鸊䴙鸌鹱鸏鹲鸑𬸚鸕鸬鸘鹴鸚鹦鸛鹳鸝鹂鸞鸾鹵卤鹸碱鹹咸鹺鹾鹼碱鹽盐麗丽麥麦麩麸麪面麫面麬𤿲麯曲麳𪎌麴曲麵面麹曲麺面麼么麽么黃黄黌黉黒黑黙默點点黨党黲黪黴霉黶黡黷黩黽黾黿鼋鼂鼌鼉鼍鼕冬鼴鼹齊齐齋斋齎赍齏齑齒齿齔龀齕龁齗龂齘𬹼齙龅齜龇齟龃齠龆齡龄齢龄齣出齦龈齧啮齪龊齬龉齮𬺈齯𫠜齲龋齶腭齷龌齼𬺓龍龙龎厐龐庞龑䶮龔龚龕龛龜龟鿁䜤鿓鿒𠁞𠀾𠗣㓆𡃕𠴛𡅏𠲥𡑍𫭼𡑭𡋗𡓾𡋀𡔖𡍣𡞵㛟𡠹㛿𡢃㛠𡮉𡭜𡮣𡭬𡳳𡳃𡻕岁𡾱㟜𢣚𢘝𢶫𢫞𢹿𢬦𣈶暅𣙎㭣𣞻𣘓𣠩𣞎𣠲𣑶𣯶毶𣾷㳢𤁣𣺽𤅶𣷷𤓩𤊰𤪺㻘𤫩㻏𤳸𤳄𥊝𥅿𥌃𥅘𥕥𥐰𥖅𥐯𥗽𬒗𥢢䅪𥸠𥮋𥼽𥹥𦘧𡳒𦣎𦟗𦪙䑽𧜗䘞𧜵䙊𧝞䘛𧟀𧝧𧩙䜥𧵳䞌𧶧䞎𨊰䢀𨊸䢁𨋢䢂𨤻𨤰𨦫䦀𨧀𬭊𨧜䦁𨨏𬭛𨭆𬭶𨭎𬭳𨯅䥿𩞯䭪𩠴𩠠𩣑䯃𩶘䲞𰻞𰻝'; // END hanzi-fold
    let hanziFold = null;
    function fold(text) {
        if (!hanziFold) {
            const chars = Array.from(HANZI_PAIRS);
            hanziFold = new Map();
            for (let i = 0; i < chars.length; i += 2)
                hanziFold.set(chars[i], chars[i + 1]);
        }
        return Array.from(text.toLowerCase(), (c) => hanziFold.get(c) || c).join('');
    }
    function matches(book, q) {
        if (!q)
            return true;
        const hay = fold([book.title, book.subtitle, book.originalTitle, book.author, book.translator, book.category, book.edition]
            .filter(Boolean).join(' '));
        return fold(q).split(/\s+/).filter(Boolean).every((word) => hay.includes(word));
    }
    function shelvesHtml() {
        const large = books.length >= library.searchFrom;
        const visible = books.filter((book) => matches(book, query));
        if (!visible.length)
            return '<p class="shelf-empty">没有找到匹配的书。</p>';
        // 每一排有自己的当前书，书名写在这一排上方（分排时在分类名下面）
        const row = (list) => '<div class="now"><strong></strong><span></span></div>'
            + `<div class="row"><ul class="track">${list.map(bookHtml).join('')}</ul></div>`;
        if (!large)
            return `<section class="shelf-group" aria-label="书架">${row(visible)}</section>`;
        const groups = new Map();
        visible.forEach((book) => {
            const key = book.category || '其他';
            if (!groups.has(key))
                groups.set(key, []);
            groups.get(key).push(book);
        });
        return [...groups].map(([name, list]) => (`<section class="shelf-group" data-group="${esc(name)}" aria-label="${esc(name)}"><h2>${esc(name)}</h2>${row(list)}</section>`)).join('');
    }
    // 分排时书架名旁边的一行分类：点一下滚到那一排，正在看的那排加深
    function refreshIndex() {
        const nav = app.querySelector('.shelf-index');
        if (!nav)
            return;
        const names = [...app.querySelectorAll('.shelf-group[data-group]')].map((group) => group.dataset.group);
        nav.innerHTML = names.length > 1
            ? names.map((name) => `<button type="button" data-group="${esc(name)}">${esc(name)}</button>`).join('')
            : '';
        markIndex();
    }
    function markIndex() {
        const buttons = [...app.querySelectorAll('.shelf-index button')];
        if (!buttons.length)
            return;
        const groups = [...app.querySelectorAll('.shelf-group[data-group]')];
        const atEnd = window.scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
        const active = atEnd ? groups.at(-1)
            : groups.filter((group) => group.getBoundingClientRect().top < innerHeight * 0.4).at(-1) || groups[0];
        buttons.forEach((button) => {
            if (button.dataset.group === active?.dataset.group)
                button.setAttribute('aria-current', 'true');
            else
                button.removeAttribute('aria-current');
        });
    }
    window.addEventListener('scroll', () => requestAnimationFrame(markIndex), { passive: true });
    // 书架只生成一次：去目录页时整个留着，回来直接放回去。
    // 书的封面在 3D 面上，新建的图片解码后 Chrome 偶尔不重画，留着已经画好的书架最稳，也更快
    let shelfPage = null;
    function renderShelf() {
        document.title = library.name;
        if (shelfPage) {
            app.replaceChildren(shelfPage);
        }
        else {
            const search = books.length >= library.searchFrom
                ? `<label class="search"><span class="sr-only">查找</span><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg><input type="search" value="${esc(query)}" placeholder="书名、作者、分类" autocomplete="off"></label>`
                : '';
            const index = books.length >= library.searchFrom ? '<nav class="shelf-index" aria-label="分类"></nav>' : '';
            app.innerHTML = `<div class="page shelf-view"><header class="identity"><h1>${esc(library.name)}</h1>${index}${search}</header>`
                + `<div class="shelves">${shelvesHtml()}</div></div>`;
            shelfPage = app.firstElementChild;
            revealWhenReady(shelfPage);
            refreshIndex();
            const input = app.querySelector('.search input');
            if (input) {
                // 拼音等输入法：选字提交前的字母不当作查找词，提交时（compositionend）再查
                const update = () => {
                    const next = input.value.trim();
                    if (next === query)
                        return;
                    query = next;
                    app.querySelector('.shelves').innerHTML = shelvesHtml();
                    revealWhenReady(shelfPage);
                    refreshIndex();
                    settle();
                };
                input.addEventListener('input', (event) => {
                    if (!event.isComposing)
                        update();
                });
                input.addEventListener('compositionend', update);
            }
        }
        const returning = lastBookId && app.querySelector(`.book[data-id="${CSS.escape(lastBookId)}"]`);
        lastBookId = null;
        settle(returning);
        if (returning)
            returning.focus({ preventScroll: true });
    }
    // 让书排重画一次：3D 面上的封面解码后 Chrome 偶尔不重画
    function repaint(root) {
        requestAnimationFrame(() => {
            root.querySelectorAll('.track').forEach((track) => {
                track.style.visibility = 'hidden';
                void track.offsetWidth;
                track.style.visibility = '';
            });
        });
    }
    // 封面要先经过访问验证再从存储读取，常常比页面慢一拍。
    // 书排先藏着，封面到齐（最多等 1.2 秒）再一起出现；每张封面加载完成后淡入，不会突然冒出来
    function revealWhenReady(root) {
        const images = [...root.querySelectorAll('.row img')];
        images.forEach((img) => {
            const done = () => img.classList.add('is-loaded');
            if (img.complete && img.naturalWidth)
                done();
            else
                img.addEventListener('load', done, { once: true });
        });
        root.classList.add('is-loading');
        const ready = Promise.all(images.map((img) => img.decode().catch(() => { })));
        Promise.race([ready, new Promise((r) => setTimeout(r, 1200))]).then(() => {
            root.classList.remove('is-loading');
            repaint(root);
        });
        ready.then(() => repaint(root));
    }
    // 记住上次打开的书，只存在这台设备的浏览器里；读写失败（无痕模式等）就当没有记录
    // 键名来自 books.json 的 library.storageKey，同一域名下的多个书库互不覆盖
    const lastKey = () => `${library.storageKey || 'bookshelf'}:last-book`;
    function rememberBook(id) {
        try {
            localStorage.setItem(lastKey(), id);
        }
        catch { /* 存不了就不记 */ }
    }
    function lastOpenedBook() {
        try {
            const id = localStorage.getItem(lastKey());
            return id ? app.querySelector(`.book[data-id="${CSS.escape(id)}"]`) : null;
        }
        catch {
            return null;
        }
    }
    // 每一排选出当前书：返回时是刚才那本；否则是上次打开的那本；都不在这一排时随机选一本
    function settle(preferred) {
        const last = lastOpenedBook();
        app.querySelectorAll('.row').forEach((row) => {
            const all = [...row.querySelectorAll('.book')];
            const current = [preferred, last].find((book) => book && row.contains(book)) || all[Math.floor(Math.random() * all.length)];
            if (current)
                setCurrent(current, { scroll: 'instant' });
        });
        // 后台准备的目录页：最可能打开的那本（刚才那本或上次打开的那本）
        const likely = preferred || last;
        if (likely)
            prepare(byId(likely.getAttribute('data-id')));
    }
    // 当前书放大、抬起，像 Paper 里选中的手帐
    // 点击、滚轮、键盘切换时书排会平滑滚过中间几本；滚动期间当前书固定为目标，标题不跟着闪
    let scrollTarget = null;
    let scrollTargetTimer = 0;
    function releaseTarget() {
        scrollTarget = null;
        clearTimeout(scrollTargetTimer);
    }
    // 当前那本书的目录页先在后台准备好（Chrome 的预渲染）：点开时页面已就绪，淡入淡出不必等加载。
    // 书停在中间 600ms 后才准备，转盘快速滑过时不白白加载
    let speculation = null;
    let prepareTimer = 0;
    function prepare(book) {
        clearTimeout(prepareTimer);
        if (!book?.directoryUrl || !HTMLScriptElement.supports?.('speculationrules'))
            return;
        const url = new URL(book.directoryUrl, location.href).href;
        if (new URL(url).origin !== location.origin || speculation?.dataset.url === url)
            return;
        prepareTimer = setTimeout(() => {
            speculation?.remove();
            speculation = Object.assign(document.createElement('script'), { type: 'speculationrules' });
            speculation.dataset.url = url;
            // 预渲染不可用时（省电模式、内存紧张等）退回到只预取页面本身
            speculation.textContent = JSON.stringify({ prerender: [{ urls: [url], eagerness: 'eager' }], prefetch: [{ urls: [url], eagerness: 'eager' }] });
            document.head.append(speculation);
        }, 600);
    }
    function setCurrent(bookEl, { scroll } = {}) {
        if (!bookEl || (bookEl.classList.contains('is-current') && !scroll))
            return;
        const changed = !bookEl.classList.contains('is-current');
        const group = bookEl.closest('.shelf-group');
        group.querySelectorAll('.book.is-current').forEach((el) => el.classList.remove('is-current'));
        bookEl.classList.add('is-current');
        const slot = bookEl.parentElement;
        const book = byId(bookEl.dataset.id);
        prepare(book);
        const now = group.querySelector('.now');
        if (book && now && changed) {
            now.firstElementChild.textContent = book.title + (book.subtitle ? ` ${book.subtitle}` : '');
            now.lastElementChild.textContent = [book.originalTitle, book.author ? `${book.author} 著` : ''].filter(Boolean).join(' · ');
            showNew(bookEl);
            if (!reduceMotion.matches)
                now.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 220, easing: EASE });
        }
        if (scroll) {
            const row = slot.closest('.row');
            const left = slot.offsetLeft + slot.offsetWidth / 2 - row.clientWidth / 2;
            const smooth = scroll !== 'instant' && !reduceMotion.matches;
            if (smooth && Math.abs(row.scrollLeft - left) > 1) {
                scrollTarget = bookEl;
                clearTimeout(scrollTargetTimer);
                // 兜底：个别浏览器没有 scrollend 事件
                scrollTargetTimer = setTimeout(releaseTarget, 900);
            }
            row.scrollTo({ left, behavior: smooth ? 'smooth' : 'instant' });
        }
    }
    // 键盘：Tab 或 ← → 切换，选中的书滑到中间
    app.addEventListener('focusin', (event) => {
        // 只响应键盘焦点；鼠标按下也会让链接获得焦点，那时交给点击逻辑处理
        const book = event.target.closest?.('a.book');
        if (book && book.matches(':focus-visible'))
            setCurrent(book, { scroll: 'smooth' });
    });
    app.addEventListener('keydown', (event) => {
        const book = event.target.closest?.('a.book');
        if (!book)
            return;
        // ↑ ↓：到上一排或下一排的当前书
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            const groups = [...app.querySelectorAll('.shelf-group')];
            const group = groups[groups.indexOf(book.closest('.shelf-group')) + (event.key === 'ArrowUp' ? -1 : 1)];
            const target = group?.querySelector('.book.is-current');
            if (!target)
                return;
            event.preventDefault();
            target.focus({ preventScroll: true });
            group.scrollIntoView({ behavior: reduceMotion.matches ? 'instant' : 'smooth', block: 'center' });
            return;
        }
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
            return;
        const slot = book.parentElement;
        const next = event.key === 'ArrowLeft' ? slot.previousElementSibling : slot.nextElementSibling;
        if (next) {
            event.preventDefault();
            next.firstElementChild.focus({ preventScroll: true });
        }
    });
    // 离这一排视觉中线最近的书
    function nearest(row) {
        const center = row.getBoundingClientRect().left + row.clientWidth / 2;
        let best = null;
        let bestDistance = Infinity;
        row.querySelectorAll('.slot').forEach((slot) => {
            const r = slot.getBoundingClientRect();
            const distance = Math.abs(r.left + r.width / 2 - center);
            if (distance < bestDistance) {
                best = slot;
                bestDistance = distance;
            }
        });
        return best?.firstElementChild || null;
    }
    // 左右滚动或滑动：停在中间的那本就是当前书
    let scrollFrame = 0;
    app.addEventListener('scroll', (event) => {
        const row = event.target;
        if (!(row instanceof Element) || !row.classList.contains('row') || drag?.moved || scrollTarget)
            return;
        cancelAnimationFrame(scrollFrame);
        scrollFrame = requestAnimationFrame(() => setCurrent(nearest(row)));
    }, true);
    app.addEventListener('scrollend', (event) => {
        if (event.target instanceof Element && event.target.classList.contains('row'))
            releaseTarget();
    }, true);
    // 鼠标滚轮：上下滚一下就换一本；滚到头以后交还给页面滚动
    // 只有指着书滚才换书；指着空白、书名、分类名滚是滚页面。
    // 一次连续滚动（间隔不到 300ms）只做一件事：滚页面时书从鼠标下滑过也不会被抢去换书
    let wheelSum = 0;
    let wheelLock = 0;
    const wheelGesture = { row: null, last: 0 };
    app.addEventListener('wheel', (event) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX))
            return;
        const time = performance.now();
        if (time - wheelGesture.last > 300) {
            wheelGesture.row = event.target.closest?.('a.book')?.closest('.row') || null;
            wheelSum = 0;
        }
        wheelGesture.last = time;
        const row = wheelGesture.row;
        if (!row)
            return;
        const current = row.querySelector('.book.is-current') || nearest(row);
        const dir = Math.sign(event.deltaY);
        const slot = current?.parentElement;
        const next = dir > 0 ? slot?.nextElementSibling : slot?.previousElementSibling;
        // 滚到这一排的头或尾：这次滚动剩下的部分交还给页面
        if (!next) {
            wheelGesture.row = null;
            return;
        }
        event.preventDefault();
        wheelSum += event.deltaY;
        if (performance.now() < wheelLock || Math.abs(wheelSum) < 30)
            return;
        wheelSum = 0;
        wheelLock = performance.now() + 280;
        setCurrent(next.firstElementChild, { scroll: 'smooth' });
    }, { passive: false });
    // 鼠标拖动：按住左右拖，松开后停到最近的一本；拖过的这一下不算点击
    let drag = null;
    app.addEventListener('pointerdown', (event) => {
        const row = event.target.closest?.('.row');
        if (!row || event.pointerType !== 'mouse' || event.button !== 0)
            return;
        releaseTarget();
        drag = { row, id: event.pointerId, x: event.clientX, left: row.scrollLeft, moved: false };
    });
    app.addEventListener('pointermove', (event) => {
        if (!drag || event.pointerId !== drag.id)
            return;
        const dx = event.clientX - drag.x;
        if (!drag.moved && Math.abs(dx) < 6)
            return;
        if (!drag.moved) {
            drag.moved = true;
            drag.row.setPointerCapture(drag.id);
            drag.row.classList.add('is-dragging');
        }
        drag.row.scrollLeft = drag.left - dx;
    });
    const endDrag = (event) => {
        if (!drag || event.pointerId !== drag.id)
            return;
        const { row, moved } = drag;
        drag = null;
        if (!moved)
            return;
        row.classList.remove('is-dragging');
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 0);
        const book = nearest(row);
        if (book)
            setCurrent(book, { scroll: 'smooth' });
    };
    app.addEventListener('pointerup', endDrag);
    app.addEventListener('pointercancel', endDrag);
    let suppressClick = false;
    /* ---------- 新章节：书名下一行“新增：…” ---------- */
    // 每本书的目录页里嵌着本书已上架章节的列表（阅读控件的 #rc-chapters）。服务器按登录邮箱记着每本书
    // “已经在目录页看到过”的章节（和阅读控件共用 /api/seen）。还有没看到过的新章节时，转到这本书时作者后面多一句“新增：…”；
    // 进了那本书的目录页就消失。没进去看也不会一直挂着：第一次出现 3 小时后自动消失，那几章算看到过；又有新章节时重新计时。
    // 第一次来时把现有章节都记为看到过。网址加 ?preview-new 时假装每本书最后一章是新加的，只预览、不写入。
    const fresh_titles = new Map();
    function showNew(bookEl) {
        const line = bookEl.closest('.shelf-group')?.querySelector('.now span');
        if (!line)
            return;
        line.querySelector('em')?.remove();
        const titles = fresh_titles.get(bookEl.dataset.id);
        if (!titles?.length)
            return;
        const em = document.createElement('em');
        em.textContent = titles.length === 1 ? `新增：${titles[0]}` : `新增 ${titles.length} 章：${titles[0]} 等`;
        line.append(em);
    }
    async function checkNew(book) {
        if (!book.directoryUrl || !/^https?:$/.test(location.protocol))
            return;
        try {
            const page = await fetch(book.directoryUrl).then((r) => (r.ok ? r.text() : ''));
            const found = page.match(/<script type="application\/json" id="rc-chapters">([\s\S]*?)<\/script>/);
            if (!found)
                return;
            const info = JSON.parse(found[1]);
            const ids = info.chapters.map((c) => c.id);
            let fresh;
            if (new URLSearchParams(location.search).has('preview-new')) {
                fresh = ids.slice(-1);
            }
            else {
                const api = `/api/seen/${encodeURIComponent(info.book)}`;
                const record = await fetch(api, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null));
                if (!record)
                    return;
                if (!Array.isArray(record.seen)) {
                    fetch(api, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seen: ids }) }).catch(() => { });
                    return;
                }
                fresh = ids.filter((id) => !record.seen.includes(id));
                if (!fresh.length)
                    return;
                const shown = Array.isArray(record.shown) ? record.shown : [];
                const put = (body) => fetch(api, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => { });
                if (fresh.some((id) => !shown.includes(id)) || !record.shownAt) {
                    put({ seen: record.seen, shown: fresh, shownAt: Date.now() });
                }
                else if (Date.now() - record.shownAt > 3 * 60 * 60 * 1000) {
                    put({ seen: [...new Set([...record.seen, ...ids])] });
                    return;
                }
            }
            const titles = info.chapters.filter((c) => fresh.includes(c.id)).map((c) => c.title);
            if (!titles.length)
                return;
            fresh_titles.set(book.id, titles);
            const current = app.querySelector(`.book.is-current[data-id="${CSS.escape(book.id)}"]`);
            if (current)
                showNew(current);
        }
        catch { /* 读不到就不提示 */ }
    }
    /* ---------- 书页 ---------- */
    function renderBook(id) {
        const book = byId(id);
        window.scrollTo(0, 0);
        if (!book) {
            document.title = library.name;
            app.innerHTML = '<div class="page book-view"><nav class="identity" aria-label="返回"><a class="back" href="#/">← 书架</a></nav>'
                + '<p class="missing">没有找到这本书。</p></div>';
            return;
        }
        lastBookId = book.id;
        if (book.directoryUrl) {
            rememberBook(book.id);
            location.replace(book.directoryUrl);
            return;
        }
        document.title = `${book.title} · ${library.name}`;
        const hasPages = (book.chapters || []).some((c) => c.pages);
        const chapters = (book.chapters || []).map((chapter) => {
            const unavailable = chapter.status === 'pending' || chapter.status === 'unpublished' || !chapter.href;
            const inner = `<span class="no">${esc(chapter.no)}</span><span class="title">${esc(chapter.title)}</span>`
                + `<span class="pages">${chapter.status === 'unpublished' ? '尚未上线' : unavailable ? '尚未整理' : esc(chapter.pages || '')}</span>`;
            return unavailable
                ? `<li><span class="chapter pending">${inner}</span></li>`
                : `<li><a class="chapter" href="${esc(chapterHref(book, chapter))}">${inner}</a></li>`;
        }).join('');
        const byline = [
            book.author ? `${esc(book.author)} 著` : '',
            book.translator ? `${esc(book.translator)} 译` : '',
        ].filter(Boolean).join('<br>');
        app.innerHTML = '<div class="page book-view">'
            + '<nav class="identity" aria-label="返回"><a class="back" href="#/">← 书架</a></nav>'
            + '<div class="book-layout">'
            + `<header class="book-head"><h1 tabindex="-1">${esc(book.title)}${book.subtitle ? `<small>${esc(book.subtitle)}</small>` : ''}${book.originalTitle ? `<small class="original">${esc(book.originalTitle)}</small>` : ''}</h1>`
            + (byline ? `<p class="byline">${byline}</p>` : '')
            + (book.edition ? `<p class="edition">${esc(book.edition)}</p>` : '')
            + '</header>'
            + `<section class="contents" aria-labelledby="contents-title"><h2 id="contents-title">目录${hasPages ? '<span>书页</span>' : ''}</h2><ol>${chapters}</ol></section>`
            + '</div></div>';
    }
    /* ---------- 打开与返回：安静的纸面淡入淡出 ---------- */
    // 不再把封面放大铺满屏幕：封面图分辨率有限，放大覆盖的转场显得刻意。
    // 点下去立刻盖上一层半透明纸色作为回应；页面切换由 CSS 的 @view-transition 在两页之间淡入淡出。
    const motionOK = () => !reduceMotion.matches && !!document.body.animate;
    // 支持跨页面视图过渡的浏览器会在两页之间自己淡入淡出；不支持的，先把纸色盖满再跳转
    const crossPageFade = 'onpagereveal' in window;
    let busy = false;
    async function leaveTo(url) {
        if (busy)
            return;
        busy = true;
        if (motionOK()) {
            const veil = document.createElement('div');
            veil.className = 'page-veil';
            veil.setAttribute('aria-hidden', 'true');
            document.body.append(veil);
            const settle = veil.animate([{ opacity: 0 }, { opacity: crossPageFade ? 0.45 : 1 }], { duration: crossPageFade ? 160 : 240, easing: 'ease-out', fill: 'forwards' }).finished.catch(() => { });
            if (!crossPageFade)
                await settle;
        }
        location.assign(url);
    }
    // 没有正式目录页的书在本页渲染目录，同样用淡入淡出切换
    function swap(update) {
        // 标签页在后台时浏览器会取消过渡，内容照常更新，不用报错
        if (motionOK() && document.startViewTransition)
            document.startViewTransition(update).ready.catch(() => { });
        else
            update();
    }
    function openBook(id) {
        const book = byId(id);
        rememberBook(id);
        if (book?.directoryUrl) {
            leaveTo(book.directoryUrl);
            return;
        }
        swap(() => {
            history.pushState(null, '', bookHash(id));
            renderBook(id);
            app.querySelector('h1')?.focus({ preventScroll: true });
        });
    }
    /* ---------- 路由与启动 ---------- */
    // 从浏览器缓存退回书架时，去掉离开时盖上的纸色
    window.addEventListener('pageshow', (event) => {
        if (!event.persisted)
            return;
        document.querySelectorAll('.page-veil').forEach((veil) => veil.remove());
        busy = false;
    });
    function render() {
        const id = routeId();
        if (id)
            renderBook(id);
        else
            renderShelf();
    }
    // 点旁边的书：先把它移到中间；点中间那本才打开
    app.addEventListener('click', (event) => {
        if (suppressClick) {
            event.preventDefault();
            return;
        }
        const jump = event.target.closest('.shelf-index button');
        if (jump) {
            // 第一排回到页面顶上，分类目录和查找还在视野里；其他排滚到分类名贴近顶部
            const group = app.querySelector(`.shelf-group[data-group="${CSS.escape(jump.dataset.group)}"]`);
            const behavior = reduceMotion.matches ? 'instant' : 'smooth';
            if (group && !group.previousElementSibling)
                window.scrollTo({ top: 0, behavior });
            else
                group?.scrollIntoView({ behavior, block: 'start' });
            return;
        }
        const book = event.target.closest('a.book');
        if (!book || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
            return;
        event.preventDefault();
        if (!book.classList.contains('is-current')) {
            setCurrent(book, { scroll: 'smooth' });
            return;
        }
        openBook(book.dataset.id);
    });
    // 浏览器前进后退、点“← 书架”：本页目录与书架之间淡入淡出
    window.addEventListener('hashchange', () => swap(render));
    function validate(list) {
        const seen = new Set();
        return list.filter((book) => {
            if (!book || !book.id || !book.title) {
                console.warn('books.json：跳过缺少 id 或 title 的条目', book);
                return false;
            }
            if (seen.has(book.id)) {
                console.warn(`books.json：重复的 id「${book.id}」，只保留第一条`);
                return false;
            }
            seen.add(book.id);
            return true;
        });
    }
    fetch('books.json', { cache: 'no-cache' })
        .then((response) => {
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        return response.json();
    })
        .then((data) => {
        library = { ...library, ...(data.library || {}) };
        books = validate(data.books || []);
        render();
        books.forEach(checkNew);
    })
        .catch((error) => {
        const hint = location.protocol === 'file:'
            ? '直接打开文件时浏览器不允许读取 books.json，请用本地预览服务打开。'
            : `读取 books.json 失败：${esc(error.message)}`;
        app.innerHTML = `<p class="notice">${hint}</p>`;
    });
})();
