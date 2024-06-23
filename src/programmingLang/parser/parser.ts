import {type Token, TokenType} from '../types/tokens'
import type {
    BinaryExpression,
    Expression,
    FunctionExpression,
    Identifier,
    IntegerLiteral,
    Operation,
    Program,
    Sets,
    SetSingle,
    Summand,
    UnaryExpression
} from '../types/astNodes.js'
import {LangCompileError} from "../types/languageError";

export class Parser {
    tokens: Token[] = []
    lastConsumedToken: Token | undefined

    constructor(tokens: Token[]) {
        this.tokens = tokens
    }

    consume(): Token {
        this.lastConsumedToken = this.tokens.shift() as Token
        return this.lastConsumedToken
    }

    peek(where = 0): Token {
        return this.tokens[where] as Token
    }

    typeMatches(where: number, ...tokenTypes: TokenType[]): boolean {
        let currentToken = this.peek(where)
        if (!currentToken || !tokenTypes.includes(currentToken.type)) {
            return false
        }
        return true
    }

    typeMatchesStatement(where: number, ...tokenTypes: TokenType[]) {
        this.skipNewLines()
        return this.typeMatches(where, ...tokenTypes)
    }

    expect(err: string, ...tokenTypes: TokenType[]): Token {
        const previousToken = this.lastConsumedToken
        const currentToken = this.consume()
        if (!currentToken || !tokenTypes.includes(currentToken.type)) {
            if (currentToken.type === TokenType.NewLine) {
                throw new LangCompileError(err, previousToken!)
            }
            throw new LangCompileError(err, currentToken)
        }

        return currentToken
    }

    expectNewStatement(err: string) {
        this.skipNewLines()
        if (this.lastConsumedToken != undefined && this.lastConsumedToken.type != TokenType.NewLine) {
            throw new LangCompileError(err, this.peek())
        }
    }

    skipNewLines() {
        while (this.peek().type === TokenType.NewLine) {
            this.consume()
        }
    }

    parse(): Program {
        const program: Program = {
            kind: "Program",
            body: []
        }
        this.expect("Программа должна начинаться со слова 'Начало'", TokenType.Start)
        program.body.push(this.parseSets())
        this.skipNewLines()
        if (this.peek().type != TokenType.Integer) {
            throw new LangCompileError("В программе должно быть слагаемое", this.peek())
        }
        program.body.push(this.parseSummand())
        this.skipNewLines()
        console.log(this.peek().type)
        if (this.peek().type != TokenType.Integer && this.peek().type != TokenType.Identifier) {
            throw new LangCompileError("В программе должна быть хотя бы одна операция", this.peek())
        }
        do {
            this.expectNewStatement("Перед началом нового оператора должна идти новая строка")
            program.body.push(this.parseOperator())
        } while (!this.typeMatchesStatement(0, TokenType.End, TokenType.EOF))
        this.expectNewStatement("Конец программы должен быть на новой строке")
        this.expect("Программа должна заканчиваться словом 'Конец'", TokenType.End)
        this.expect("После слова 'Конец' не может быть символов", TokenType.EOF)

        return program
    }


    parseSets(): Sets {
        const sets: Sets = {
            kind: "Sets",
            body: []
        }
        this.skipNewLines()
        console.log(this.peek())
        if (this.peek().type != TokenType.First && this.peek().type != TokenType.Second) {
            throw new LangCompileError("В программе должно быть хотя бы одно множество", this.peek())
        }
        do {
            this.expectNewStatement("Перед началом нового множества должна идти новая строка")
            sets.body.push(this.parseSet())
        } while (this.typeMatchesStatement(0, TokenType.First, TokenType.Second))

        return sets
    }

    parseSet(): SetSingle {
        const keyword = this.expect("Множество должно начинаться с 'Первое' или 'Второе'", TokenType.First, TokenType.Second);

        switch (keyword.type) {
            case TokenType.First:
                let identifiers: Identifier[] = []

                const firstToken = this.expect(`После 'Первое' должны стоять только переменные, разделенные запятой`, TokenType.Identifier)
                identifiers.push({kind: "Identifier", symbol: firstToken} as Identifier)

                while (!this.typeMatches(0, TokenType.NewLine)) {
                    const commaToken = this.expect(`Переменные должны быть разделены запятой`, TokenType.Comma)

                    const identifierToken = this.expect(`После запятой должная стоять переменная`, TokenType.Identifier)
                    identifiers.push({kind: "Identifier", symbol: identifierToken} as Identifier)
                }

                this.expect("Множество должно заканчиваться на новую строку", TokenType.NewLine);

                return {
                    kind: "SetSingle",
                    body: identifiers
                }

            case TokenType.Second:
                let numbers: IntegerLiteral[] = []
                do {
                    const integerToken = this.expect(`После 'Второе' должны стоять только целые`, TokenType.Integer)
                    numbers.push({kind: "IntegerLiteral", value: +integerToken.value} as IntegerLiteral)
                } while (!this.typeMatches(0, TokenType.NewLine))

                this.expect("Множество должно заканчиваться на новую строку", TokenType.NewLine);

                return {
                    kind: "SetSingle",
                    body: numbers
                }
        }
    }

    parseSummand(): Summand {
        let numbers: IntegerLiteral[] = []

        const firstToken = this.expect(`Слагаемое должно состоять из целых чисел, разделенных запятой`, TokenType.Integer)
        numbers.push({kind: "IntegerLiteral", value: +firstToken.value} as IntegerLiteral)

        while (!this.typeMatches(0, TokenType.End)) {
            const commaToken = this.expect(`Целые должны быть разделены запятой`, TokenType.Comma)

            const integerToken = this.expect(`После 'Второе' должны стоять только целые`, TokenType.Integer)
            numbers.push({kind: "IntegerLiteral", value: +integerToken.value} as IntegerLiteral)
        }

        this.expect("Слагаемое должно заканчиваться на 'Конец слагаемого'", TokenType.End);
        this.expect("Слагаемое должно заканчиваться на 'Конец слагаемого'", TokenType.EndOfSummand);

        return {
            kind: "Summand",
            body: numbers
        }
    }

    parseOperator(): Operation {
        const identifierOrTag = this.expect("Операция должна начинаться с объявления переменной или с метки", TokenType.Identifier, TokenType.Integer)
        let identifier = identifierOrTag;
        let tag = identifierOrTag;
        if (identifierOrTag.type === TokenType.Integer) {
            const semicolon = this.expect("После метки должно идти двоеточие", TokenType.Colon)
            identifier = this.expect("Операция должна начинаться с объявления переменной", TokenType.Identifier)
        }

        this.expect("После объявление переменной должен стоять знак '='", TokenType.Equals)
        const rhs = this.parseAddition()
        if (!this.typeMatches(0, TokenType.NewLine)) {
            console.log(this.tokens, this.lastConsumedToken)
            throw new LangCompileError("Выражения должны быть объединены операторами сложения ('+','-')\nили логическими операторами ('&&','||','1') или функциями\n('Синус', 'Косинус', 'Тангенс', 'Котангенс')", this.peek())
        }
        return {
            kind: "Operation",
            tag: tag,
            identifier: identifier,
            rhs: rhs
        }
    }

    parseAddition(): Expression {
        let operation: Token | null = null
        if (this.peek().value === "-") {
            operation = this.consume()
        }
        let left = this.parseMultiplication()
        if (operation) {
            left = {kind: "UnaryExpression", inner: left, operation: operation} as UnaryExpression
        }
        while (this.typeMatches(0, TokenType.AdditiveOperators)) {
            const operator = this.consume()
            const right = this.parseMultiplication()
            left = {
                kind: "BinaryExpression",
                lhs: left,
                rhs: right,
                operator
            } as BinaryExpression
        }
        return left
    }

    parseMultiplication(): Expression {
        let left = this.parseLogic()
        while (this.typeMatches(0, TokenType.MultiplicativeOperators)) {
            const operator = this.consume()
            const right = this.parseLogic()
            left = {
                kind: "BinaryExpression",
                lhs: left,
                rhs: right,
                operator
            } as BinaryExpression
        }
        return left
    }

    parseLogic(): Expression {
        let left = this.parseReverseLogic()

        while (this.typeMatches(0, TokenType.LogicOperators)) {
            const operator = this.consume()
            const right = this.parseReverseLogic()
            left = {
                kind: "BinaryExpression",
                lhs: left,
                rhs: right,
                operator
            } as BinaryExpression
        }
        return left
    }

    parseReverseLogic(): Expression {
        let operation: Token | null = null
        if (this.peek().value === "!" || this.peek().value === "НЕ") {
            operation = this.consume()
        }
        let inner = this.parseFunctions()

        if (operation) {
            inner = {
                kind: "UnaryExpression",
                inner: inner,
                operation: operation
            } as UnaryExpression
        }

        return inner
    }

    parseFunctions(): Expression {
        const functions: Token[] = []
        while (this.typeMatches(0, TokenType.Function)) {
            functions.push(this.consume())
        }

        let inner = this.parsePrimitives()
        while (functions.length > 0) {
            inner = {
                kind: "FunctionExpression",
                inner: inner,
                func: functions.pop()
            } as FunctionExpression
        }

        return inner
    }

    parsePrimitives(): Expression {
        switch (this.peek().type) {
            case TokenType.AdditiveOperators:
            case TokenType.MultiplicativeOperators:
            case TokenType.LogicOperators:
                throw new LangCompileError("Две операции не могут стоять подряд", this.peek())
        }

        const currentToken = this.expect(`После '${this.lastConsumedToken?.value}' должны быть Переменная или Целое число`, TokenType.Integer, TokenType.Identifier)

        switch (currentToken.type) {
            case TokenType.Identifier:
                return {kind: "Identifier", symbol: currentToken} as Identifier
            case TokenType.Integer:
                return {kind: "IntegerLiteral", value: +currentToken.value} as IntegerLiteral
        }
        throw new LangCompileError("В выражении должны быть только Переменная или Целое число", currentToken)
    }
}
