import React, { useState, useEffect, forwardRef} from "react";
import rangy from "rangy/lib/rangy-selectionsaverestore";
import MonkeyLexer from "./MonkeyLexer";
import { Popover } from 'antd';
import {changeSpaceToNBSP, createLineSpan} from "./tools/common"

const MonkeyCompilerEditer = forwardRef((props,inputInstance)=> {
    const {keyWords} = props;
    const lineSpanNode= "LineSpan"
    const [popoverStyle, setPopoverStyle] = useState({
      title: "",
      content: ""
    })
    const textNodeArray = []
    let keyWordElementArray = []
    let identifierElementArray = []
    let lastBegin = 0
    const [keyWordClass, setKeywordClass] = useState("keyword")
    const [lineNodeClass, setLineNodeClass] = useState("line")
    const [identifierClass, setIdentifierClass] = useState("Identifier")
    const [breakPointClass, setBreakPointClass] = useState("BreakPoint")
    const [keyToIgnore, setKeyToIgnore] = useState( [
      "Enter",
      " ",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
    ])
    const [bpMap, setBpMap] = useState({})
    const [textAreaStyle] = useState({
      height: 480,
      border: "2px solid black",
      counterReset: "line",
      fontFamily: "monospace",
    })
   useEffect(()=>{
     rangy.init();
     initPopoverControl()
   },[])
    useEffect(()=>{
        createLineSpan();
    })
  const initPopoverControl = () => {
    setPopoverStyle( {
        title: "",
        content: ""
    })
  }

  // dom树，找到节点，提供给lexer进行分词
  const changeNode = (n) => {
    if (n.childNodes && n.childNodes.length !== 0){
      const f = n.childNodes;
      for (const c in f) {
        changeNode(f[c]);
      }
    }
    if (n.data) {
      lastBegin = 0;
      n.keyWordCount = 0;
      n.identifierCount = 0;
      const localLexer = new MonkeyLexer(n.data);
      localLexer.setLexingObserver(notifyTokenCreation,n , localLexer);
      localLexer.lexing();
    }
  }
  // 观察者模式  回调获得token对象，以及初始及结束位置
  const notifyTokenCreation = (token, elementNode, begin, end, localLexer) => {
    const e = {};
    e.node = elementNode;
    e.begin = begin;
    e.end = end;
    e.token = token;

    if (keyWords[token.getLiteral()] !== undefined) {
      elementNode.keyWordCount++;
      keyWordElementArray.push(e);
    }

    if (
      elementNode.keyWordCount === 0 &&
      token.getType() === localLexer.IDENTIFIER
    ) {
      elementNode.identifierCount++;
      identifierElementArray.push(e); //存入关键词数组
    }
  }

  const hightLightKeyWord =(token, elementNode, begin, end) => {
    let strBefore = elementNode.data.substr(
      lastBegin,
      begin - lastBegin
    );
    //空格转换为unicode
    strBefore = changeSpaceToNBSP(strBefore);
    const textNode = document.createTextNode(strBefore);
    const parentNode = elementNode.parentNode;
    parentNode.insertBefore(textNode, elementNode);
    textNodeArray.push(textNode);
    //  关键词设置一个span标签
    const span = document.createElement("span");
    span.style.color = "green";
    span.classList.add(keyWordClass);
    span.appendChild(document.createTextNode(token.getLiteral()));
    parentNode.insertBefore(span, elementNode);
    lastBegin = end - 1;
    elementNode.keyWordCount--
  }

  const hightLightSyntax = () => {
    textNodeArray.length = 0;
    for ( let i = 0; i < keyWordElementArray.length; i++) {
      const e = keyWordElementArray[i];
      const currentElement = e.node
      hightLightKeyWord(e.token, e.node, e.begin, e.end);

      if (currentElement.keyWordCount === 0) {
        const end = currentElement.data.length;
        let lastText = currentElement.data.substr(lastBegin, end);
        lastText = changeSpaceToNBSP(lastText);
        const parent = currentElement.parentNode;
        const lastNode = document.createTextNode(lastText);
        parent.insertBefore(lastNode, currentElement);
        // 解析最后一个节点，这样可以为关键字后面的变量字符串设立popover控件
        textNodeArray.push(lastNode);
        parent.removeChild(currentElement);
      }
    }
    keyWordElementArray = []
  }

  const getCaretLineNode = () => {
    const sel = document.getSelection();
    //得到光标所在行的node对象
    const nd = sel.anchorNode;
    //查看其父节点是否是span,如果不是，
    //我们插入一个span节点用来表示光标所在的行
    let currentLineSpan = null;
    const elements = document.getElementsByClassName(lineSpanNode);
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element.contains(nd)) {
        currentLineSpan = element;
      }
      //删除自动复制的span class属性
      while (element.classList.length > 0) {
        element.classList.remove(element.classList.item(0));
      }
      element.classList.add(lineSpanNode);
      element.classList.add(lineNodeClass + String(i));
    }

    if (currentLineSpan !== null) {
      currentLineSpan.onclick = (e) => {
        createBreakPoint(e.toElement);
      }
      return currentLineSpan;
    }

    //计算一下当前光标所在节点的前面有多少个div节点，
    //前面的div节点数就是光标所在节点的行数
    const divElements = inputInstance.current.childNodes;
    let l = 0;
    for (let i = 0; i < divElements.length; i++) {
      if (divElements[i].tagName === "DIV" && divElements[i].contains(nd)) {
        l = i;
        break;
      }
    }

    const spanNode = document.createElement("span");
    spanNode.classList.add(lineSpanNode);
    spanNode.classList.add(lineNodeClass + String(l));
    spanNode.dataset.lineNum = String(l);

    spanNode.onclick =  (e) => {
      createBreakPoint(e.toElement);
    };

    nd.parentNode.replaceChild(spanNode, nd);
    spanNode.appendChild(nd);
    return spanNode;
  }

  const createBreakPoint = (elem) => {
    if (elem.classList.item(0) !== lineSpanNode) {
      return;
    }
    //是否已存在断点，是的话就取消断点
    if (elem.dataset.bp === "true") {
      let bp = elem.previousSibling;
      bp.remove();
      elem.dataset.bp = "false";
      delete bpMap["" + elem.dataset.lineNum];
      if (props.ide !== null) {
          props.ide.updateBreakPointMap(bpMap);
      }
      return;
    }

    //构造一个红色圆点
    elem.dataset.bp = "true";
    bpMap["" + elem.dataset.lineNum] = elem.dataset.lineNum;
    const bp = document.createElement("span");
    bp.style.height = "10px";
    bp.style.width = "10px";
    bp.style.backgroundColor = "red";
    bp.style.borderRadius = "50%";
    bp.style.display = "inline-block";
    bp.classList.add(breakPointClass);
    elem.parentNode.insertBefore(bp, elem.parentNode.firstChild);
    if (props.ide !== null) {
      props.ide.updateBreakPointMap(bpMap);
    }
  }

  const handleIdentifierOnMouseOver = (e) => {
    e.currentTarget.isOver = true;
    const token = e.currentTarget.token;
    setPopoverStyle(
      {
        title:"Syntax",
        content:  "name:" + token.getLiteral() + "\nType:" + token.getType()
      }
    )
    if (props.ide !== null) {
      const env = props.ide.getSymbolInfo(token.getLiteral());
      if (env) {
      setPopoverStyle({
            title: token.getLiteral(),
            content: env
          })
      }
    }
  }

  const handleIdentifierOnMouseOut = () => {
    initPopoverControl();
  }

  const addPopoverSpanToIdentifier = (token, elementNode, begin, end) => {
    let strBefore = elementNode.data.substr(
      lastBegin,
      begin - lastBegin
    );
    strBefore = changeSpaceToNBSP(strBefore);
    const textNode = document.createTextNode(strBefore);
    const parentNode = elementNode.parentNode;
    parentNode.insertBefore(textNode, elementNode);

    const span = document.createElement("span");
    span.onmouseenter = handleIdentifierOnMouseOver;
    span.onmouseleave = handleIdentifierOnMouseOut;
    span.classList.add(identifierClass);
    span.appendChild(document.createTextNode(token.getLiteral()));
    span.token = token;
    parentNode.insertBefore(span, elementNode);
    lastBegin = end - 1 ;
    elementNode.identifierCount--
  }

  const addPopoverByIdentifierArray = () => {
    //该函数的逻辑跟hightLightSyntax一摸一样
    for (let i = 0; i < identifierElementArray.length; i++) {
      //用 span 将每一个变量包裹起来，这样鼠标挪上去时就可以弹出popover控件
      const e = identifierElementArray[i];
      const currentElement = e.node
      //找到每个IDENTIFIER类型字符串的起始和末尾，给他们添加span标签
      addPopoverSpanToIdentifier(e.token, e.node, e.begin, e.end);

      if (currentElement.identifierCount === 0) {
        const end = currentElement.data.length;
        let lastText = currentElement.data.substr(lastBegin, end);
        lastText = changeSpaceToNBSP(lastText);
        const parent = currentElement.parentNode;
        const lastNode = document.createTextNode(lastText);
        parent.insertBefore(lastNode, currentElement);
        parent.removeChild(currentElement);
      }
    }
    identifierElementArray = []
  }

  const preparePopoverForIdentifers = () => {
    if (textNodeArray.length > 0) {
      //fix bug
      identifierElementArray.length = 0;
      for (let i = 0; i < textNodeArray.length; i++) {
        //将text 节点中的文本提交给词法解析器抽取IDENTIFIER
        changeNode(textNodeArray[i]);
        addPopoverByIdentifierArray();
      }
      textNodeArray.length = 0;
    } else {
      //为解析出的IDENTIFIER字符串添加鼠标取词功能
      addPopoverByIdentifierArray();
    }
  }

   const onDivContentChange = (evt) => {
    if (keyToIgnore.indexOf(evt.key) >= 0) {
      return;
    }

    let bookmark = undefined;
    if (evt.key !== "Enter") {
      //使用rangy组件确认光标能回到原来的位置
      bookmark = rangy.getSelection().getBookmark(inputInstance.current);
    }

    //每当有输入只重新词法解析当前行
    let currentLine = getCaretLineNode();
    for (let i = 0; i < currentLine.childNodes.length; i++) {
      if (
        currentLine.childNodes[i].className === keyWordClass ||
        currentLine.childNodes[i].className === identifierClass
      ) {
        const child = currentLine.childNodes[i];
        const t = document.createTextNode(child.innerText);
        currentLine.replaceChild(t, child);
      }
    }
    //把所有相邻的text node 合并成一个
    currentLine.normalize();
    identifierElementArray.length = 0;
    changeNode(currentLine);
     hightLightSyntax();
    preparePopoverForIdentifers();

    if (evt.key !== "Enter") {
      rangy.getSelection().moveToBookmark(bookmark);
    }
  }

  const onClickDiv = () => {
    /*
        只有把pointerEvents设置为none，我们才能抓取鼠标在每行
        数字处点击的信息，但是设置后mouseenter消息就不能接收到
        于是当我们把鼠标挪到变量上方时，无法显现popover
        */
    const lineSpans = document.getElementsByClassName(lineSpanNode);
    for (let i = 0; i < lineSpans.length; i++) {
      lineSpans[i].style.pointerEvents = "none";
    }
  }

  const onMouseEnter = () => {
    /*
        要想让popover控件出现，必须接收mouseenter时间，
        只有把pointerEvent设置为空而不是none时，这个时间才能传递给
        span
        */
    const lineSpans = document.getElementsByClassName(lineSpanNode);
    for (let i = 0; i < lineSpans.length; i++) {
      lineSpans[i].style.pointerEvents = "";
    }
  }

    return (
      <div>
          <Popover
              arrowPointAtCenter
              placement = "topLeft"
              content = {popoverStyle.content}
              title = {popoverStyle.title}
              id = "identifier-show"
          >
        <div
          style = {textAreaStyle}
          onKeyUp = {onDivContentChange}
          ref = {inputInstance}
          contentEditable
        >
        </div>
        </Popover>
      </div>
    );
  }
)
export default MonkeyCompilerEditer;
