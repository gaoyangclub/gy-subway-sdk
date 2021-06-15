高德地铁线路图比百度地铁线路图精致很多，故仿照高德地铁线路图绘制
此demo仅供学习使用，请勿商用，如非法使用后果自负
![image.png](https://upload-images.jianshu.io/upload_images/11449836-82140090b2b6749b.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

# 接入方式
```javascript
<script src="sdk/gy-subway-sdk.js"></script>
<script type="text/javascript">
    var map = new GYSubwayMap("wrapper", "tipView", { adcode: "1100", focusMiddleSite: true });
	map.onEvent("siteSelected", function (siteObj) {//站点选中
		selectedSiteObj = siteObj;
	});
	map.onEvent("loaded", function (dataList) {
		// console.log("获取到所有线路数据dataList:" + dataList.length);
		for (var i = dataList.length - 1; i >= 0; i--) {
			var metroName = dataList[i].metroName;
			var metroBranch = dataList[i].metroBranch;
			console.log("获取到线路名		: 	" + metroName + (metroBranch ? "	分支		:" + metroBranch : ""));
		}
	});
	map.onEvent("routerStart", function (startSite, endSite) {//站点选中
		console.log("开始寻路:" + startSite.n + " -> " + endSite.n);
		//显示加载中
	});
	map.onEvent("routerSuccess", function (startSite, endSite) {//站点选中
		console.log("寻路成功:" + startSite.n + " -> " + endSite.n);
		//隐藏加载中
	});
	map.onEvent("routerFail", function () {//站点选中
		alert("寻路失败");
		//隐藏加载中
	});
</script>
```
# 数据解析
通过高德地铁API接口，获取对应城市的地铁线路数据，结构如下:
```javascript
{
    "o": "1070,531",//地图尺寸
    "l": [{//地图线路
        "lo": "0",//是否环线
        "li": "900000065767|900000065856",//表示归属于哪条线，整个线包含多段线路，线路id用|分离
        "ls": "900000065767",//线路id
        "c": ["0 205", "55 205"],//绘制连线的点
        "cl": "008FA5",//线路颜色
        "lp": ["796 131"],//地铁名坐标
        "st": [{//站点列表
            "sl": "120.007201,30.285632",//站点经纬度
            "sid": "900000065767004",//站点id
            "n": "良睦路",//站点名
            "poiid": "BV10780758",//路径搜索时候使用标志
            "t": "0",//是否换乘站
            "lg": "0",//方向
            "p": "0 205",//站点坐标 
            "rs": "0 205"//站点坐标范围，部分站坐标存在多个
        }],
    }],
}
```
获取到地铁线路数据后，对原始数据进行解析，将页面分成多个层分别进行绘制，分为tips层、交互层、站点层、绘制线路层、背景层等。
# 实现流程
* 数据加载完成后初始化所有的层容器，确定叠放次序
* 获取地图站点位置数据，添加每个站点的交互热区
* 绘制站点线路、连接点、换乘站、站点文本、线路信息
* 点击交互区域，设置起点、终点站点
* 搜索路径点信息，绘制路径规划结果视图
### 添加每个站点的交互热区、站点文本
```
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
```
### 视图层线路、连接点、换乘站
```
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
```
### 