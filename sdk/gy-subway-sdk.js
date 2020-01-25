/**
 * 非web前端出身，代码没按照规范来，请轻喷
 * 高德地铁线路图比百度地铁线路图精致很多，故仿照高德地铁线路图绘制
 * 此demo仅供学习使用，请勿商用，如非法使用后果自负
 * Created by gy先生 on 2020/1/25.
 */

var ml = 3;

var leftpadding = 300 * ml;
var toppadding = 200 * ml;

var nodeLineWidth = 3 * ml;
var metroLineWidth = 6 * ml;

var minZoomValue = 0.5;
var maxZoomValue = ml - 1;
var startZoomValue = minZoomValue + 0.5;

var citylist;//城市列表

function GYSubwayMap(container, tip, info) {
    this._init_(container, tip, info);
}

GYSubwayMap.prototype = {

    constructor: GYSubwayMap,
    _init_: function (container, tip, info) {

        this._events = {};

        this.container = container;
        this.tip = tip;
        if (info.focusMiddleSite !== undefined && info.focusMiddleSite !== null) {
            this.focusMiddleSite = info.focusMiddleSite;
        } else {
            this.focusMiddleSite = true;
        }
        if (info.adcode !== undefined && info.adcode !== null) {
            this.cityAdcode = info.adcode;
        } else {
            this.cityAdcode = "1100";//城市code 默认北京
        }

        this.showSubwayLine(null);
    },

    //不传id表示所有线路
    showSubwayLine: function (id) {
        this._showMap(this.container, this.tip, id);
    },

    setStartSite: function (siteObj) {
        this.startSiteObj = siteObj;
        this._initStartView();
    },

    setEndSite: function (siteObj) {
        this.endSiteObj = siteObj;
        this._initEndView();
    },

    //展示整个地图层
    _showMap: function (container, tip, id) {
        this.selectSubwayId = id;
        if (this.wrapper) {//直接显示
            this._drawSubwayLine();
        } else {
            if (typeof (container) == 'string') {//字符串类型
                this.wrapper = document.getElementById(container);
            } else {
                this.wrapper = container;
            }
            if (typeof (tip) == 'string') {
                this.tipView = document.getElementById(tip);
            } else {
                this.tipView = tip;
            }
            this.tipViewDisplay = this.tipView.style.display;

            var script1 = document.createElement("script");
            script1.type = "text/javascript";
            script1.src = "dist/bscroll.js";

            var heads = document.getElementsByTagName("head");
            if (heads.length) {
                heads[0].appendChild(script1);
            } else {
                document.documentElement.appendChild(script1);
            }
            window.onload = this._loaded.bind(this);
        }
    },

    _loaded: function () {
        var that = this;

        //加载城市数据
        requestGetResult("http://webapi.amap.com/subway/data/citylist.json", 10 * 1000, function (dataString) {
            var cityData = JSON.parse(dataString);
            citylist = cityData.citylist;
            // console.log("that.cityAdcode:" + that.cityAdcode);
            //加载目标城市地铁数据
            var cityObj = getCityObjByCode(that.cityAdcode);
            var url = "http://webapi.amap.com/subway/data/" + that.cityAdcode + "_drw_" + cityObj.spell + ".json";
            requestGetResult(url, 10 * 1000, function (dataMetroString) {
                var stadata = JSON.parse(dataMetroString);

                that._initPage(stadata);
                setTimeout(function () {
                    // import BScroll from 'better-scroll'
                    // console.log("loaded执行完毕");
                    that.myscroll = new BScroll(that.wrapper, {
                        scrollX: true,
                        scrollY: true,
                        dblclick: true,
                        zoom: {
                            start: startZoomValue,
                            min: minZoomValue,
                            max: maxZoomValue
                        }
                    });
                    that.myscroll.on("zoomEnd", function () {
                        // console.log("停止缩放");
                        that._followTip(that.nowScale, false);
                    });
                    that.myscroll.on("scaleChanged", function (scale) {
                        that.nowScale = scale;
                    });

                    that._scrollToCenter(that.viewWidth / 2., that.viewHeight / 2., 0);

                }, 100);
            });
        });

    },

    _initPage: function (stadata) {
        initTapEvent();

        this.wrapper.style.overflow = "hidden";

        this.viewContainer = document.createElement("div");
        this.viewContainer.style.position = "relative";
        this.wrapper.appendChild(this.viewContainer);

        this.dataArray = stadata.l;
        console.log("dataArray.length:" + stadata.l.length);

        var backContainer = document.createElement("div");
        backContainer.style.position = "absolute";
        backContainer.style.width = "100%";
        backContainer.style.height = "100%";
        this.viewContainer.appendChild(backContainer);

        if (isPC()) {
            backContainer.addEventListener('click', this._hideTipView.bind(this), false);
        } else {
            backContainer.addTapEvent(this._hideTipView.bind(this), true);
        }

        var ratio = window.devicePixelRatio;

        var screenSizeObj = stadata.o;
        var screenSizeArr = screenSizeObj.split(",");
        var sourceWidth = parseInt(screenSizeArr[0]) * ratio;
        var sourceHeight = parseInt(screenSizeArr[1]) * ratio;

        this.backSvgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.backSvgContainer.style.position = "absolute";
        this.backSvgContainer.style.width = "100%";
        this.backSvgContainer.style.height = "100%";
        backContainer.appendChild(this.backSvgContainer);

        this.backTouchContainer = document.createElement('div'); //2、找到父级元素
        this.backTouchContainer.style.position = "absolute";
        this.backTouchContainer.style.width = "100%";
        this.backTouchContainer.style.height = "100%";
        backContainer.appendChild(this.backTouchContainer);

        this.lineContainer = document.createElement("div");
        this.lineContainer.style.position = "absolute";
        this.lineContainer.style.backgroundColor = "rgba(255,255,255,0.8)";
        this.viewContainer.appendChild(this.lineContainer);

        this.lineSvgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.lineSvgContainer.style.position = "absolute";
        this.lineSvgContainer.style.width = "100%";
        this.lineSvgContainer.style.height = "100%";
        this.lineContainer.appendChild(this.lineSvgContainer);

        this.lineTouchContainer = document.createElement('div'); //2、找到父级元素
        this.lineTouchContainer.style.position = "absolute";
        this.lineTouchContainer.style.width = "100%";
        this.lineTouchContainer.style.height = "100%";
        this.lineContainer.appendChild(this.lineTouchContainer);

        this.routerContainer = document.createElement("div");
        this.routerContainer.style.position = "absolute";
        this.routerContainer.style.width = this.routerContainer.style.height = "0px";
        this.viewContainer.appendChild(this.routerContainer);

        this.routerSvgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.routerSvgContainer.style.position = "absolute";
        this.routerSvgContainer.style.width = "100%";
        this.routerSvgContainer.style.height = "100%";
        this.routerContainer.appendChild(this.routerSvgContainer);

        this.routerTouchContainer = document.createElement('div'); //2、找到父级元素
        this.routerTouchContainer.style.position = "absolute";
        this.routerTouchContainer.style.width = "100%";
        this.routerTouchContainer.style.height = "100%";
        this.routerContainer.appendChild(this.routerTouchContainer);

        this.tipContainer = document.createElement('div');
        this.tipContainer.style.position = "absolute";
        this.viewContainer.appendChild(this.tipContainer);

        if (this.tipView) {
            this.tipView.style.position = "absolute";
            this.tipView.style.transformOrigin = "center bottom";
            this.tipContainer.appendChild(this.tipView);
            this._hideTipView(null);
        }

        this.viewWidth = sourceWidth * ml + leftpadding * 2;
        this.viewHeight = sourceHeight * ml + toppadding * 2;

        this.viewContainer.style.width = this.viewWidth + "px";
        this.viewContainer.style.height = this.viewHeight + "px";

        this._initTouchContainer(this.dataArray, this.backTouchContainer, true);
        this._refillMap(this.dataArray, this.backSvgContainer);

        this._drawSubwayLine();

        this._loadedCallBack();
    },

    //添加交互区域提供点击功能
    _initTouchContainer: function (dataArray, touchContainer, canTouch) {
        touchContainer.innerHTML = "";//先清空掉
        var radius = 3 * ml;
        var touchWidth = 32 * ml;
        for (var i = dataArray.length - 1; i >= 0; i--) {
            var dataObj = dataArray[i];
            // var pointArray = dataObj.c;//绘制连线的点
            var siteArray = dataObj.st;//站点信息
            var metroPointArr = dataObj.lp;
            var metroColor = "#" + dataObj.cl;
            var metroName = dataObj.ln;

            if (metroPointArr && metroName) {
                for (var j = metroPointArr.length - 1; j >= 0; j--) {
                    var metroPointObj = metroPointArr[j];
                    var metroPointObjArr = metroPointObj.split(" ");

                    var metroPointX = parseInt(metroPointObjArr[0]) * ml + leftpadding;
                    var metroPointY = parseInt(metroPointObjArr[1]) * ml + toppadding;

                    var label = document.createElement('text'); //1、创建元素
                    label.innerHTML = metroName;
                    label.style.fontFamily = "黑体";
                    label.style.fontSize = (12 * ml) + "px";
                    label.style.position = "absolute";
                    label.style.webkitUserSelect = "none";
                    label.style.color = "#FFFFFF";
                    label.style.paddingLeft = label.style.paddingRight = 5 * ml + "px";
                    label.style.backgroundColor = metroColor;
                    label.style.textAlign = "center";
                    label.style.borderRadius = radius + "px";
                    touchContainer.appendChild(label);//插入到最左边

                    var textWidth = label.offsetWidth;//text.getBoundingClientRect().width;
                    var textHeight = label.offsetHeight;//text.getBoundingClientRect().height;

                    label.style.left = metroPointX + "px";
                    label.style.top = (metroPointY - textHeight / 2. - 5 * ml) + "px";
                }
            }

            for (var j = siteArray.length - 1; j >= 0; j--) {
                var siteObj = siteArray[j];
                var pointObj = siteObj.p;
                var pointObjArr = pointObj.split(" ");
                var pointX = parseInt(pointObjArr[0]) * ml + leftpadding;
                var pointY = parseInt(pointObjArr[1]) * ml + toppadding;

                var siteName = siteObj.n;

                var span = document.createElement('span'); //1、创建元素
                span.style.position = "absolute";
                span.style.width = touchWidth + "px";
                span.style.height = touchWidth + "px";
                span.style.left = (pointX - touchWidth / 2.) + "px";
                span.style.top = (pointY - touchWidth / 2.) + "px";
                // span.style.backgroundColor = "yellow";
                span.siteObj = siteObj;
                touchContainer.appendChild(span);//插入到最左边


                if (siteObj.t == "1") {//换乘站
                    var image = document.createElement('img'); //1、创建元素
                    showTransferImage(image);
                    image.style.width = image.style.height = (20 * ml) + "px";
                    image.style.position = "absolute";
                    image.style.margin = "auto";
                    image.style.top = image.style.left = image.style.bottom = image.style.right = "0px";
                    span.appendChild(image);
                }

                var text = document.createElement('text'); //1、创建元素
                text.innerHTML = siteName;
                text.style.fontFamily = "黑体";
                text.style.fontSize = (12 * ml) + "px";
                text.style.position = "absolute";
                text.style.webkitUserSelect = "none";
                // text.style.backgroundColor = "yellow";
                text.siteObj = siteObj;
                touchContainer.appendChild(text);//插入到最左边

                var textWidth = text.offsetWidth;//text.getBoundingClientRect().width;
                var textHeight = text.offsetHeight;//text.getBoundingClientRect().height;

                var tp = getTextPoint(pointX, pointY, textWidth, textHeight, siteObj.lg);

                text.style.left = tp.x + "px";
                text.style.top = tp.y + "px";

                if (canTouch) {
                    if (isPC()) {
                        span.addEventListener('click', this._elementTouchHandler.bind(this), false);
                        text.addEventListener('click', this._elementTouchHandler.bind(this), false);
                    } else {
                        span.addTapEvent(this._elementTouchHandler.bind(this), true);
                        text.addTapEvent(this._elementTouchHandler.bind(this), true);
                    }
                }
            }
        }
    },

    _elementTouchHandler: function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (!this.myscroll.isInTransition) {
            var siteObj = e.currentTarget.siteObj;
            var pointObjArr = siteObj.p.split(" ");
            var pointX = parseInt(pointObjArr[0]) * ml + leftpadding;
            var pointY = parseInt(pointObjArr[1]) * ml + toppadding;
            this._scrollToCenter(pointX, pointY, 200);

            this.tipView.style.display = this.tipViewDisplay;
            this.tipView.style.transform = "scale(" + (1 / this.nowScale) + ")";
            var tipWidth = this.tipView.getBoundingClientRect().width;
            var tipHeight = this.tipView.getBoundingClientRect().height;
            this.tipView.style.left = pointX - tipWidth / 2 + "px";
            this.tipView.style.top = pointY - tipHeight - 10 * ml + "px";

            this.selectSiteObj = siteObj;

            this.trigger("siteSelected", this.selectSiteObj);
        }
    },

    //视图层重绘
    _refillMap: function (dataArray, svgContainer) {
        svgContainer.innerHTML = "";//清理掉原有数据
        for (var i = dataArray.length - 1; i >= 0; i--) {
            var dataObj = dataArray[i];
            var pointArray = dataObj.c;//绘制连线的点
            var siteArray = dataObj.st;//站点信息

            var metroColor = "#" + dataObj.cl;

            for (var j = pointArray.length - 2; j >= 0; j--) {
                var prePointObj = pointArray[j + 1];
                var nowPointObj = pointArray[j];
                var prePointObjArr = prePointObj.split(" ");
                var nowPointObjArr = nowPointObj.split(" ");
                var prePointX = parseInt(prePointObjArr[0]) * ml + leftpadding;
                var prePointY = parseInt(prePointObjArr[1]) * ml + toppadding;
                var nowPointX = parseInt(nowPointObjArr[0]) * ml + leftpadding;
                var nowPointY = parseInt(nowPointObjArr[1]) * ml + toppadding;

                svgContainer.innerHTML += "<line x1=" + prePointX + " y1=" + prePointY + " x2=" + nowPointX + " y2=" + nowPointY + " stroke-linecap='round' style='stroke:" + metroColor + ";stroke-width:" + metroLineWidth + "'/>"
            }

            for (var j = siteArray.length - 1; j >= 0; j--) {
                var siteObj = siteArray[j];
                var pointObj = siteObj.p;
                var pointObjArr = pointObj.split(" ");
                var pointX = parseInt(pointObjArr[0]) * ml + leftpadding;
                var pointY = parseInt(pointObjArr[1]) * ml + toppadding;
                if (siteObj.t != "1") {//换乘站
                    svgContainer.innerHTML += "<circle cx=" + pointX + " cy=" + pointY + " r=" + (7 * ml) + " fill='#FFFFFF' stroke=" + metroColor + " stroke-width=" + nodeLineWidth + " />"
                }
            }
        }
    },

    _loadedCallBack: function () {
        var metroList = [];
        for (var i = this.dataArray.length - 1; i >= 0; i--) {
            var dataObj = this.dataArray[i];
            var metroColor = "#" + dataObj.cl;
            var metroName = dataObj.ln;
            var metroBranch = dataObj.la;
            var metroId = dataObj.ls;
            metroList.push({ id: metroId, metroName: metroName, metroColor: metroColor, metroBranch: metroBranch });
        }
        this.trigger("loaded", metroList);
    },

    //时时缩放跟随的tip
    _followTip: function (scale, fource) {
        if (this.tipView.style.display != "none" && this.selectSiteObj) {//显示中
            var pointObjArr = this.selectSiteObj.p.split(" ");
            var pointX = parseInt(pointObjArr[0]) * ml + leftpadding;
            var pointY = parseInt(pointObjArr[1]) * ml + toppadding;

            this.tipView.style.transform = "scale(" + (1 / scale) + ")";
            var tipWidth = this.tipView.getBoundingClientRect().width;
            var tipHeight = this.tipView.getBoundingClientRect().height;

            this.tipView.style.left = pointX - tipWidth / 2 + "px";
            this.tipView.style.top = pointY - tipHeight - 10 * ml + "px";
        }
    },

    _drawSubwayLine: function () {

        this._hideTipView(null);

        if (this.selectSubwayId) { //显示
            var index = getMetroIndex(this.selectSubwayId, this.dataArray);

            if (index >= 0) {
                this.lineContainer.style.width = "100%";
                this.lineContainer.style.height = "100%";
                this.lineContainer.style.display = "block";

                var dataObj = this.dataArray[index];
                this._initTouchContainer([dataObj], this.lineTouchContainer, true);
                this._refillMap([dataObj], this.lineSvgContainer);

                //-----------------  找出中间的站点位置 地图居中  ----------------------
                if (this.focusMiddleSite && this.routerContainer.style.width == "0px") {
                    this._doFocusMiddleSite(dataObj.st, false);
                }
                //-----------------

                if (isPC()) {
                    this.lineContainer.addEventListener('click', this._hiddenLineContainer.bind(this), false);
                } else {
                    this.lineContainer.addTapEvent(this._hiddenLineContainer.bind(this), false);
                }
            }

        } else { //隐藏

            this._clearMapRouter();

            this._hiddenLineContainer(null);
        }
    },

    _initStartView: function () {
        if (!this.startSiteView) {
            var startSiteView = document.createElement("img");
            startSiteView.style.position = "absolute";
            startSiteView.style.width = 25 * ml + "px";
            startSiteView.style.height = 40 * ml + "px";
            // startSiteView.style.backgroundColor = "#FFFF00";
            startSiteView.src = "https://api.map.baidu.com/images/subway/start-bak.png";

            this.tipContainer.appendChild(startSiteView);

            this.startSiteView = startSiteView;
        }
        var pointObjArr = this.startSiteObj.p.split(" ");
        var pointX = parseInt(pointObjArr[0]) * ml + leftpadding;
        var pointY = parseInt(pointObjArr[1]) * ml + toppadding;

        this.startSiteView.style.display = "block";
        var tipWidth = this.startSiteView.offsetWidth;
        var tipHeight = this.startSiteView.offsetHeight;

        this.startSiteView.style.left = pointX - tipWidth / 2 + "px";
        this.startSiteView.style.top = pointY - tipHeight + "px";

        this._hideTipView(null);

        this._checkMapRouter();
    },

    _initEndView: function () {
        if (!this.endSiteView) {
            endSiteView = document.createElement("img");
            endSiteView.style.position = "absolute";
            endSiteView.style.width = 25 * ml + "px";
            endSiteView.style.height = 40 * ml + "px";
            endSiteView.src = "https://api.map.baidu.com/images/subway/end-bak.png";

            this.tipContainer.appendChild(endSiteView);
            this.endSiteView = endSiteView;
        }
        var pointObjArr = this.endSiteObj.p.split(" ");
        var pointX = parseInt(pointObjArr[0]) * ml + leftpadding;
        var pointY = parseInt(pointObjArr[1]) * ml + toppadding;

        this.endSiteView.style.display = "block";
        var tipWidth = this.endSiteView.offsetWidth;
        var tipHeight = this.endSiteView.offsetHeight;

        this.endSiteView.style.left = pointX - tipWidth / 2 + "px";
        this.endSiteView.style.top = pointY - tipHeight + "px";

        this._hideTipView(null);

        this._checkMapRouter();
    },

    //"隐藏tipView"
    _hideTipView: function (e) {
        this.tipView.style.display = "none";//先隐藏
    },

    //根据起终点位置查找路径点
    _checkMapRouter: function () {
        if (this.startSiteObj && this.endSiteObj) {//请求寻路

            this.trigger("routerStart", this.startSiteObj, this.endSiteObj);
            var that = this;
            //请求换乘数据
            var url = "http://webapi.amap.com/subway/service/navigation/busExt?poiid1=" + this.startSiteObj.poiid +
                "&poiid2=" + this.endSiteObj.poiid + "&type=6&Ver=3";
            requestGetResult(url, 10 * 1000, function (dataString) {
                // console.log("请求结果:" + dataString);
                var routerList = analyzeRouterResult(JSON.parse(dataString), that.dataArray);
                //拼装成数组
                if (routerList) {

                    that.lineSvgContainer.innerHTML = "";//清除掉元素
                    that.lineTouchContainer.innerHTML = "";//清除掉元素

                    that.routerContainer.style.width = that.lineContainer.style.width = "100%";
                    that.routerContainer.style.height = that.lineContainer.style.height = "100%";

                    that._refillMap(routerList, that.routerSvgContainer);
                    that._initTouchContainer(routerList, that.routerTouchContainer, false);

                    var focusArray = [];
                    for (var i = routerList.length - 1; i >= 0; i--) {
                        var dataObj = routerList[i];
                        var siteArray = dataObj.st;
                        for (var j = siteArray.length - 1; j >= 0; j--) {
                            focusArray.push(siteArray[j]);//存储到一维数组中
                        }
                    }
                    that._doFocusMiddleSite(focusArray, true);

                    that.trigger("routerSuccess", that.startSiteObj, that.endSiteObj);
                } else {
                    // alert("获取路径点失败");
                    that._clearMapRouter();
                    that.trigger("routerFail");
                }

            });
        }
    },

    _doFocusMiddleSite: function (siteArray, autoScale) {

        if (!autoScale) {
            var middleIndex = parseInt(siteArray.length / 2);
            console.log("middleIndex:" + middleIndex + "/" + siteArray.length);
            var pointObjArr = siteArray[middleIndex].p.split(" ");
            this._scrollToCenter(parseInt(pointObjArr[0]) * ml + leftpadding, parseInt(pointObjArr[1]) * ml + toppadding, 200);
        } else {
            var lastSiteObj = siteArray[siteArray.length - 1];
            var lastPointObjArr = lastSiteObj.p.split(" ");

            var minX = parseInt(lastPointObjArr[0]);
            var minY = parseInt(lastPointObjArr[1]);
            var maxX = minX;
            var maxY = minY;
            for (var i = siteArray.length - 2; i >= 0; i--) {
                var siteObj = siteArray[i];
                var pointObjArr = siteObj.p.split(" ");
                var pointX = parseInt(pointObjArr[0]);
                var pointY = parseInt(pointObjArr[1]);
                if (pointX < minX) {
                    minX = pointX;
                }
                if (pointY < minY) {
                    minY = pointY;
                }
                if (pointX > maxX) {
                    maxX = pointX;
                }
                if (pointY > maxY) {
                    maxY = pointY;
                }
            }

            var wrapperWidth = wrapper.getBoundingClientRect().width;
            var wrapperHeight = wrapper.getBoundingClientRect().height;

            var padding = 150;
            var hScale = wrapperWidth / ((maxX - minX + padding) * ml);
            var vScale = wrapperHeight / ((maxY - minY + padding) * ml);

            var toScale = Math.min(hScale, vScale);
            if (toScale > maxZoomValue) {
                toScale = maxZoomValue;
            } else if (toScale < minZoomValue) {
                toScale = minZoomValue;
            }

            this.myscroll.zoomTo(toScale, 0, 0);

            this.nowScale = toScale;
            this._followTip(toScale, true);

            var centerPointX = (minX + maxX) / 2.;
            var centerPointY = (minY + maxY) / 2.;

            this._scrollToCenter(centerPointX * ml + leftpadding, centerPointY * ml + toppadding, 200);
        }

    },

    _scrollToCenter: function (pointX, pointY, duration) {
        var wrapperWidth = this.wrapper.getBoundingClientRect().width;
        var wrapperHeight = this.wrapper.getBoundingClientRect().height;
        var scale = this.nowScale ? this.nowScale : this.viewContainer.getBoundingClientRect().width / this.viewWidth; //
        var px = -pointX * scale + wrapperWidth / 2.;
        var py = -pointY * scale + wrapperHeight / 2.;

        this.myscroll.stop();
        var that = this;
        setTimeout(function () {
            that.myscroll.scrollTo(px, py, duration);
        }, 50);
    },

    _hiddenLineContainer: function (e) {
        this.lineSvgContainer.innerHTML = "";//清除掉元素
        this.lineTouchContainer.innerHTML = "";//清除掉元素
        this.lineContainer.style.width = "0px";
        this.lineContainer.style.height = "0px";

        this._hideTipView(null);//tip也关闭
    },

    _clearMapRouter: function () {
        this.startSiteView ? this.startSiteView.style.display = "none" : "";
        this.endSiteView ? this.endSiteView.style.display = "none" : "";//隐藏视图
        this.startSiteObj = this.endSiteObj = null;//清理状态

        this.routerContainer.style.width = this.routerContainer.style.height = "0px";
        this.routerSvgContainer.innerHTML = "";//数据清除
        this.routerTouchContainer.innerHTML = "";
    },

    onEvent: function (type, fn) {

        var context = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this;
        if (!this._events[type]) {
            this._events[type] = [];
        }

        this._events[type].push([fn, context]);
    },

    trigger: function (type) {
        var events = this._events[type];
        if (!events) {
            return;
        }

        var len = events.length;
        var eventsCopy = [].concat(toConsumableArray(events));
        for (var i = 0; i < len; i++) {
            var event = eventsCopy[i];

            var _event = slicedToArray(event, 2),
                fn = _event[0],
                context = _event[1];

            if (fn) {
                fn.apply(context, [].slice.call(arguments, 1));
            }
        }
    },
}

function getSiteObjById(id, targetArray, dataArray) {
    return getSiteObjByKey("sid", id, targetArray, dataArray);
}

function getSiteObjByName(name, targetArray, dataArray) {
    return getSiteObjByKey("n", name, targetArray, dataArray);
}

function getSiteObjByKey(key, value, targetArray, dataArray) {
    if (targetArray) {//优先从目标数组中查找
        for (var i = targetArray.length - 1; i >= 0; i--) {
            var siteObj = targetArray[i];
            if (siteObj[key] == value) {
                return siteObj;
            }
        }
        // return null;
    }
    for (var i = dataArray.length - 1; i >= 0; i--) {
        var dataObj = dataArray[i];
        var siteArray = dataObj.st;//站点信息
        for (var j = siteArray.length - 1; j >= 0; j--) {
            var siteObj = siteArray[j];
            if (siteObj[key] == value) {
                return siteObj;
            }
        }
    }
    return null;
}

function analyzeRouterResult(data, dataArray) {
    if (data.buslist && data.buslist.length > 0) {
        var routerList = [];

        var segmentlist = data.buslist[0].segmentlist;

        for (var i = segmentlist.length - 1; i >= 0; i--) {
            var segmentObj = segmentlist[i];

            if (!segmentObj) {
                continue;
            }

            var index = getMetroIndex(segmentObj.busid, dataArray);
            var dataObj = dataArray[index];
            var siteArray = [];

            checkSiteIdAndSave(siteArray, segmentObj.startid, segmentObj.startname, dataObj.st, dataArray);

            if (segmentObj.passdepotid) {
                var passdeIdArray = segmentObj.passdepotid.split(" ");
                var passdeNameArray = segmentObj.passdepotname.split(" ");
                for (var j = 0; j < passdeIdArray.length; j++) {
                    checkSiteIdAndSave(siteArray, passdeIdArray[j], j < passdeNameArray.length ? passdeNameArray[j] : null, dataObj.st, dataArray);
                }
            }

            checkSiteIdAndSave(siteArray, segmentObj.endid, segmentObj.endname, dataObj.st, dataArray);

            if (siteArray.length > 1) {
                routerList.push({
                    c: getSitePointArray(siteArray, dataObj.c, dataObj.lo == "1", dataObj.st),
                    cl: dataObj.cl,
                    st: siteArray
                });
            }
        }

    }
    return routerList && routerList.length > 0 ? routerList : null;
}


function getSitePointArray(siteArray, pointArray, isRound, sourceSiteArray) {
    //分析路径点
    var startSite = siteArray[0];
    var endSite = siteArray[siteArray.length - 1];

    var sitePointArray = [];
    var firstSite;
    var secondSite;
    if (isRound) {//环线
        var roundPointArray = checkRoundPointArray(siteArray, pointArray, sourceSiteArray);
        pointArray = roundPointArray ? roundPointArray : pointArray;
    }
    for (var j = pointArray.length - 1; j >= 0; j--) {
        var point = pointArray[j];
        if (!firstSite && (startSite.rs.indexOf(point) >= 0 || endSite.rs.indexOf(point) >= 0)) {
            firstSite = (startSite.rs.indexOf(point) >= 0 ? startSite : endSite);
            secondSite = (startSite.rs.indexOf(point) >= 0 ? endSite : startSite);
        }
        if (firstSite) {
            sitePointArray.push(point);
        }
        if (firstSite && secondSite.rs.indexOf(point) >= 0) {
            firstSite = secondSite = null;
            break;
        }
    }
    return sitePointArray;
}

//将环线的路径进行重组后返回
function checkRoundPointArray(siteArray, pointArray, sourceSiteArray) {
    var firstSite = siteArray[0];
    var secondSite = siteArray[siteArray.length - 1];
    //取前后两个站点位置
    var firstIndex = getSitePointIndex(firstSite.rs, pointArray);
    var secondIndex = getSitePointIndex(secondSite.rs, pointArray);
    if (firstIndex < 0 || secondIndex < 0) {
        alert("getSitePointIndex获取失败");
        return null;
    }
    if (firstIndex > secondIndex) {
        if (firstIndex - secondIndex > siteArray.length - 1 &&
            checkRoundPointAcross(firstSite, secondSite, firstIndex, secondIndex, siteArray, pointArray, sourceSiteArray)) {//明显超出 正向
            //查找中间的点是否被经过 如果超过属于正向
            console.log("checkRoundPointArray 明显超出 正向");
            return reformRoundPointArray(secondIndex, pointArray, false);
        } else {//逆向
            return reformRoundPointArray(secondIndex, pointArray, true);
        }
    }
    if (secondIndex > firstIndex) {
        if (secondIndex - firstIndex > siteArray.length - 1 &&
            checkRoundPointAcross(firstSite, secondSite, firstIndex, secondIndex, siteArray, pointArray, sourceSiteArray)) {//明显超出 逆向
            console.log("checkRoundPointArray 明显超出 逆向");
            return reformRoundPointArray(secondIndex, pointArray, true);
        } else {//正向
            return reformRoundPointArray(secondIndex, pointArray, false);
        }
    }
}

function checkRoundPointAcross(firstSite, secondSite, firstIndex, secondIndex, siteArray, pointArray, sourceSiteArray) {
    var sourceFirstIndex = sourceSiteArray.indexOf(firstSite);
    var sourceSecondIndex = sourceSiteArray.indexOf(secondSite);
    var sourceCenterIndex1 = (sourceFirstIndex + 1 > sourceSiteArray.length - 1 ? 0 : sourceFirstIndex + 1);//取;
    var sourceCenterIndex2 = (sourceFirstIndex - 1 < 0 ? sourceSiteArray.length - 1 : sourceFirstIndex - 1);//取;
    if (sourceCenterIndex1 == sourceSecondIndex) {//相邻
        sourceCenterIndex1 = -1;//不用检查
    } else if (sourceCenterIndex2 == sourceSecondIndex) {//相邻
        sourceCenterIndex2 = -1;//不用检查
    } else {//不相邻
        // alert("这两个点居然不相邻，有问题")
    }
    var isPointAcross = false;
    if (sourceCenterIndex1 >= 0) {
        var sourceCenterSite = sourceSiteArray[sourceCenterIndex1];
        if (siteArray.indexOf(sourceCenterSite) >= 0) {//已存在 不检查这个方向

        } else {
            var pointCenterIndex = getSitePointIndex(sourceCenterSite.rs, pointArray);
            if (firstIndex > secondIndex) {
                isPointAcross = (firstIndex > pointCenterIndex && pointCenterIndex > secondIndex);
            } else {
                isPointAcross = (firstIndex < pointCenterIndex && pointCenterIndex < secondIndex);
            }
        }
    }
    if (!isPointAcross && sourceCenterIndex2 >= 0) {
        var sourceCenterSite = sourceSiteArray[sourceCenterIndex2];
        if (siteArray.indexOf(sourceCenterSite) >= 0) {//已存在 不检查这个方向

        } else {
            var pointCenterIndex = getSitePointIndex(sourceCenterSite.rs, pointArray);
            if (firstIndex > secondIndex) {
                isPointAcross = (firstIndex > pointCenterIndex && pointCenterIndex > secondIndex);
            } else {
                isPointAcross = (firstIndex < pointCenterIndex && pointCenterIndex < secondIndex);
            }
        }
    }
    return isPointAcross;
}

function reformRoundPointArray(firstIndex, pointArray, reverse) {
    var pointCount = pointArray.length;
    var roundPointArray = [];
    if (reverse) {
        for (var i = firstIndex - 1; i >= 0; i--) {
            roundPointArray.push(pointArray[i]);
        }
        for (var i = pointCount - 1; i >= firstIndex; i--) {
            roundPointArray.push(pointArray[i]);
        }
    } else {
        for (var i = firstIndex + 1; i < pointCount; i++) {
            roundPointArray.push(pointArray[i]);
        }
        for (var i = 0; i <= firstIndex; i++) {
            roundPointArray.push(pointArray[i]);
        }
    }
    return roundPointArray;
}

function getSitePointIndex(rs, pointArray) {
    for (var j = pointArray.length - 1; j >= 0; j--) {
        var point = pointArray[j];
        if (rs.indexOf(point) >= 0) {
            return j;
        }
    }
    return -1;
}

function checkSiteIdAndSave(siteArray, id, name, targetArray, dataArray) {
    var siteObj = getSiteObjById(id, targetArray, dataArray);
    if (!siteObj && name) {
        siteObj = getSiteObjByName(name, targetArray, dataArray);
    }
    if (siteObj) {
        siteArray.push(siteObj);
    }
    return siteObj;
}

function requestGetResult(url, time, callback) {
    var request = new XMLHttpRequest();
    var timeout = false;
    var timer = setTimeout(function () {
        timeout = true;
        request.abort();
    }, time);
    request.open("GET", url);
    request.onreadystatechange = function () {
        if (request.readyState !== 4) return;
        if (timeout) return;
        clearTimeout(timer);
        if (request.status === 200) {
            callback(request.responseText);
        }
    }
    request.send(null);
}

function getMetroIndex(id, dataArray) {
    for (var i = dataArray.length - 1; i >= 0; i--) {
        var dataObj = dataArray[i];
        var metroIdObj = dataObj.li;
        if (metroIdObj.indexOf(id) >= 0) {
            return i;
        }
    }
    return -1;
}

function getCityObjByCode(adcode) {
    for (var i = citylist.length - 1; i >= 0; i--) {
        var cityObj = citylist[i];
        if (cityObj.adcode == adcode) {
            return cityObj;
        }
    }
    return null;
}

//2:右 4:下 3:右下 6:左 0:上 1:右上 5:左下 7:左上
function getTextPoint(pointX, pointY, textW, textH, direct) {
    var offset = 8 * ml;
    switch (direct) {
        case "0":
            return { x: pointX - textW / 2., y: pointY - textH - offset - 2 * ml };
        case "1":
            return { x: pointX + offset, y: pointY - textH - offset };
        case "2":
            return { x: pointX + offset + 5 * ml, y: pointY - textH / 2. };
        case "3":
            return { x: pointX + offset, y: pointY + offset };
        case "4":
            return { x: pointX - textW / 2., y: pointY + offset };
        case "5":
            return { x: pointX - textW - offset, y: pointY + offset };
        case "6":
            return { x: pointX - textW - offset - 2 * ml, y: pointY - textH / 2. };
        case "7":
            return { x: pointX - textW - offset, y: pointY - textH - offset };
    }
    // console.log("pointX:" + 0 + "\npointY" + 0);
    return { x: 0, y: 0 };
}

//判断是否是PC端
function isPC() {
    var userAgentInfo = navigator.userAgent;
    var Agents = ["Android", "iPhone",
        "SymbianOS", "Windows Phone",
        "iPad", "iPod"];
    var flag = true;
    for (var v = 0; v < Agents.length; v++) {
        if (userAgentInfo.indexOf(Agents[v]) > 0) {
            flag = false;
            break;
        }
    }
    return flag;
}

function initTapEvent() {
    if (!HTMLElement.prototype.addTapEvent) {
        HTMLElement.prototype.addTapEvent = function (callback, isStopPropagation) {
            var tapStartTime = 0,
                tapEndTime = 0,
                tapTime = 500, //tap等待时间，在此事件下松开可触发方法
                tapStartClientX = 0,
                tapStartClientY = 0,
                tapEndClientX = 0,
                tapEndClientY = 0,
                tapScollHeight = 15, //水平或垂直方向移动超过15px测判定为取消（根据chrome浏览器默认的判断取消点击的移动量)
                cancleClick = false;
            this.addEventListener('touchstart', function () {
                tapStartTime = event.timeStamp;
                var touch = event.changedTouches[0];
                tapStartClientX = touch.clientX;
                tapStartClientY = touch.clientY;
                cancleClick = false;
            })
            this.addEventListener('touchmove', function (event) {
                var touch = event.changedTouches[0];
                tapEndClientX = touch.clientX;
                tapEndClientY = touch.clientY;
                if ((Math.abs(tapEndClientX - tapStartClientX) > tapScollHeight) || (Math.abs(tapEndClientY - tapStartClientY) > tapScollHeight)) {
                    cancleClick = true;
                }
            })
            this.addEventListener('touchend', function (event) {
                tapEndTime = event.timeStamp;
                if (!cancleClick && (tapEndTime - tapStartTime) <= tapTime) {
                    callback(event);
                }
            })
        }
    }
}

function showTransferImage(img) {
    var dataURLs = "data:image/png;base64,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"
    img.src = dataURLs;
}

function toConsumableArray(arr) {
    if (Array.isArray(arr)) {
        for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];
        return arr2;
    } else {
        return Array.from(arr);
    }
}

var slicedToArray = function () {
    function sliceIterator(arr, i) {
        var _arr = [];
        var _n = true;
        var _d = false;
        var _e = undefined;

        try {
            for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
                _arr.push(_s.value);

                if (i && _arr.length === i) break;
            }
        } catch (err) {
            _d = true;
            _e = err;
        } finally {
            try {
                if (!_n && _i["return"]) _i["return"]();
            } finally {
                if (_d) throw _e;
            }
        }

        return _arr;
    }

    return function (arr, i) {
        if (Array.isArray(arr)) {
            return arr;
        } else if (Symbol.iterator in Object(arr)) {
            return sliceIterator(arr, i);
        } else {
            throw new TypeError("Invalid attempt to destructure non-iterable instance");
        }
    };
}();
