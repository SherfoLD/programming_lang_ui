export interface Token {
    value: string,
    type: TokenType,
    from: number,
    to: number,
    isSpaceBefore?: boolean
}

export enum TokenType {
    //// SINGLE CHAR TOKENS
    Colon,
    Equals,
    AdditiveOperators, // [+,-]
    MultiplicativeOperators, // [*,/]
    Dot,
    Comma,
    //// MULTICHAR TOKENS
    // RESERVED
    Start,
    End,
    First,
    Second,
    EndOfSummand,
    Function,
    LogicOperators, // WHAT IS LOGIC? [&&, ||, И, ИЛИ] SOLVE FOR EQUALS
    // FREE
    Identifier,
    Integer,
    EOF,
    NewLine
}
