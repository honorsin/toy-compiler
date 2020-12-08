import React , {Component} from 'react'
import * as bootstrap from 'react-bootstrap'
import MonkeyLexer from './MonkeyLexer'
import MonkeyCompilerEditer from './MonkeyCompilerEditer'
import MonkeyCompilerParser from './MonkeyCompilerParser' //引入只是为了sourcemap
import MonkeyEvaluator from './MonkeyEvaluator'
import Worker from './channel.worker'

class MonkeyCompilerIDE extends Component {

    constructor(props) {
        super(props)
        this.lexer = new MonkeyLexer("")
        this.evaluator = new MonkeyEvaluator()
        // this.state = {stepEnable: false}
        // this.breakPointMap = null
        // this.channelWorker = new Worker()
    }

    updateBreakPointMap(bpMap) {
      this.breakPointMap = bpMap
    }

    onLexingClick () { 
        // this.inputInstance.setIDE(this)
        // this.channelWorker.postMessage(['code', this.inputInstance.getContent()])
        // this.channelWorker.addEventListener('message',
        // this.handleMsgFromChannel.bind(this))
        this.lexer = new MonkeyLexer(this.inputInstance.getContent())
        this.parser = new MonkeyCompilerParser(this.lexer)
        this.parser.parseProgram()
        this.program = this.parser.program
        this.evaluator.eval(this.program)
   } 

   handleMsgFromChannel(e) {
     let cmd = e.data
     if (Array.isArray(e.data)) {
      cmd = e.data[0]
     }
       let execInfo = e.data[1]
     if (cmd === "beforeExec") {
        console.log("receive before execBefore msg from channel worker")
        this.setState({stepEnable: true})
        this.currentLine = execInfo['line']
        this.currentEnviroment = execInfo['env']
        this.inputInstance.hightlineByLine(execInfo['line'], true)
     } else if (cmd === "finishExec") {
        console.log("receive finishExec msg: ", e.data[1])
         this.currentEnviroment = execInfo['env']
        //alert("exec finish")
     }
   }

   getSymbolInfo(name) {
     return this.currentEnviroment[name]
   }

    onContinueClick () {
      this.channelWorker.postMessage("execNext")
      this.setState({stepEnable: false})
      this.inputInstance.hightlineByLine(this.currentLine, false)
    }


    getCurrentEnviroment() {
      return this.currentEnviroment
    }

    render () {
        return (
          <bootstrap.Panel header="Monkey Compiler" bsStyle="success">
            <MonkeyCompilerEditer 
             ref={(ref) => {this.inputInstance = ref;}}
             keyWords={this.lexer.getKeyWords()}
             //evaluator = {this.evaluator}
            />
            <bootstrap.Button onClick={this.onLexingClick.bind(this)} 
             style={{marginTop: '16px'}}
             bsStyle="danger">
              Parsing
            </bootstrap.Button>

          </bootstrap.Panel>
          );
    }
}

export default MonkeyCompilerIDE