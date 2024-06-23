<script setup lang="ts">
import {onMounted, ref} from "vue";
import {SourceCode} from "@/programmingLang/lexer/sourceCode";
import {tokenize} from "@/programmingLang/lexer/tokenize";
import {Parser} from "@/programmingLang/parser/parser";
import Scope from "@/programmingLang/compiler/scope";
import {evaluate} from "@/programmingLang/compiler/compiler";
import {LangCompileError, LangSyntaxError} from "@/programmingLang/types/languageError";

const backdropRef = ref<HTMLDivElement>()
const highlightRef = ref<HTMLDivElement>()
const srcRef = ref<HTMLTextAreaElement>()

let output = ref<string>("")

let highlightInner = ref<string>("")
let textareaScroll: number = 0

// TODO: РАЗДЕЛИТЬ НА ФАЙЛЫ
// TODO: Сделать пример больше
// TODO: Добавить проверку 'Неверный формат переменной' + Зарезервированные слова
// TODO: Незивестен '+' в контексте '**' (объявлении переменной)

function highlightText() {
  if (!srcRef.value) return

  try {
    const source = new SourceCode(srcRef.value.value)
    const tokens = tokenize(source)
    console.warn(tokens)
    const ast = new Parser(tokens).parse()

    const scope = new Scope()
    evaluate(ast, scope)
    let variablesLog = ""
    scope.variables.forEach((v: any, k: any) => {
      console.log(k)
      const octalNumber = toOctal(parseFloat(v.value));
      console.log(octalNumber);
      variablesLog += `${k} = ${octalNumber}\n`
    })
    output.value = variablesLog
  } catch (e) {
    let start = 0
    let end = 0
    switch ((e as Error).name) {
      case "CompileError": {
        const error = e as LangCompileError
        start = error.token.from
        end = error.token.to
        break
      }
      case "SyntaxError": {
        const error = e as LangSyntaxError
        start = error.from
        end = error.to
      }
    }
    const originalText = srcRef.value.value;

    const beforeHighlight = originalText.substring(0, start - 1);
    const highlightedText = originalText.substring(start - 1, end);
    const afterHighlight = originalText.substring(end);

    highlightInner.value = beforeHighlight + '<mark>' + highlightedText + '</mark>' + afterHighlight;
    output.value = (e as Error).message
  }
}

function updateScroll() {
  if (!srcRef.value) return
  const scrollY = srcRef.value.scrollTop
  const scrollX = srcRef.value.scrollLeft

  backdropRef.value?.scrollTo(scrollX, scrollY)
}

function clearMarks() {
  if (!srcRef.value) return
  highlightInner.value = srcRef.value.value
}

onMounted(() => {
  if (!srcRef.value) return
  highlightInner.value = srcRef.value.value
})

function toOctal(num) {
  const integerPart = parseInt(num);
  const fractionalPart = num - integerPart;

  const octalInteger = integerPart.toString(8);

  let octalFraction = '';
  let fraction = fractionalPart;
  let limit = 0;  // Prevent infinite loop in case of non-terminating conversions

  // Convert the fractional part
  while (fraction > 0 && limit < 10) {
    fraction *= 8;
    const digit = parseInt(fraction);
    octalFraction += digit.toString();
    fraction -= digit;
    limit++;
  }

  return octalFraction ? `${octalInteger}.${octalFraction}` : octalInteger;
}
</script>

<template>
  <div style="display: flex; flex-direction: column; width: 100%; height: 100%; padding: 40px">
    <div>
      <h1 style="text-align: center">БНФ языка</h1>
      <textarea rows="17" cols="150" disabled style="font-weight: 500;">Язык = "Начало" Множество...Множество Слагаемое Оператор...Оператор "Конец"
Множество = "Первое" Переменная  ","...Переменная ! "Второе" Целое...Целое
Слагаемое = Целое ","...Целое "Конец слагаемого"
Оператор = </Метка ":"/> Переменная "=" Пр.ч.
Пр.ч = </"-"/> Блок ["+" ! "-"]...Блок
Блок = Блок2 ["*" ! "/"]...Блок2
Блок2 = Блок3 ["&&" ! "||"]... Блок3
Блок3 = </"!"/> Блок4
Блок4 = </Функ...Функ/> Блок5
Блок5 = Целое ! Переменная
Функ = "Синус" ! "Косинус" ! "Тангенс" ! "Котангенс"
Переменная = Б</Сим...Сим/>
Метка = Целое
Целое = Ц...Ц
Сим=Б!Ц
Б="А"!"Б"!..."Я"!"а"!"б"!..."я"
Ц="0"!"1"!..."7"</textarea>
    </div>
    <div style="margin-top: 20px">
      <h1 style="text-align: center">Код программы</h1>
      <div class="backdrop" ref="backdropRef">
        <div class="highlights" ref="highlightRef" v-html="highlightInner"></div>
      </div>
      <textarea rows="18" cols="150" @input="clearMarks" @scroll="updateScroll" ref="srcRef" autocomplete="off"
                autocapitalize="off"
                spellcheck="false">Начало
Первое ПЕРЕМ1, ПЕРЕМ2, ПЕРЕМ3
Второе 123 741 1 32
Первое ПЕРЕМ4

34, 324 Конец слагаемого

ПЕРЕМ1 = 400 + 200
0: ПЕРЕМ2 = ПЕРЕМ1 * 2
ПЕРЕМ3 = Косинус Синус ПЕРЕМ2 + !0
ПЕРЕМ4 = !0 && 1 || !ПЕРЕМ3
1: ПЕРЕМ5 = ПЕРЕМ1 + ПЕРЕМ2 * ПЕРЕМ3 + ПЕРЕМ4

Конец</textarea>

    </div>
    <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
      <button @click="highlightText" style="padding: 10px; width: 150px; font: 18px 'Times New Roman'">
        Выполнить
      </button>
    </div>
    <div class="output">
      <pre>Вывод программы:<br>{{ output }}</pre>
    </div>
  </div>
</template>

<style>
.highlights, textarea {
  padding: 10px;
  font: 14px/20px "Helvetica Neue";
  letter-spacing: 1px;
}

.backdrop {
  position: absolute;
  z-index: 1;
  background-color: transparent;
  overflow: auto;
  pointer-events: none;
  transition: transform 1s;
}

.highlights {
  white-space: pre-wrap;
  word-wrap: break-word;
  color: transparent;
}

textarea {
  background-color: transparent;
}

mark {
  border-radius: 3px;
  color: transparent;
  background-color: rgba(255, 89, 89, 0.37);
  text-decoration: red underline wavy;
}

pre {
  border: 2px solid #74637f;
  margin-top: 5px;
  padding: 5px;
  border-radius: 2px;
}
</style>
