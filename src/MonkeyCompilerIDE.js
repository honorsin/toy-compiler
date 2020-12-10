import React , {Fragment, useRef} from 'react'
import { Button } from 'antd';
import MonkeyLexer from './MonkeyLexer'
import MonkeyCompilerEditer from './MonkeyCompilerEditer'
import MonkeyCompilerParser from './MonkeyCompilerParser'
import MonkeyEvaluator from './MonkeyEvaluator'

function MonkeyCompilerIDE() {
    const lexer = new MonkeyLexer('')
    const evaluator = new MonkeyEvaluator()
    const inputInstance = useRef()
    const onLexingClick = () => {
        const lexer = new MonkeyLexer(inputInstance.current.divInstance.innerText)
        const parser = new MonkeyCompilerParser(lexer)
        parser.parseProgram()
        const program = parser.program
        evaluator.eval(program)
    }

    return (
        <Fragment>
            <div className="page-header">
                <h1>Monkey Compiler</h1>
            </div>
            <Button type="primary" danger>
                Primary
            </Button>
            <MonkeyCompilerEditer
                ref={inputInstance}
                keyWords={lexer.getKeyWords()}
            />
            <Button
                onClick={onLexingClick}
                style={{marginTop: '16px'}}
            >
                Parsing
            </Button>
        </Fragment>
    );
}

export default MonkeyCompilerIDE