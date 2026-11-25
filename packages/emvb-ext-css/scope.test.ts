import { describe, expect, test } from "bun:test";
import { scopeGlobalSelectors, scopeSelectorList } from "./scope.ts";

const S = ":where(.emvb-ext)";
describe("scopeGlobalSelectors", () => {
  test("bare elements and universal selectors get the scope", () => {
    expect(scopeGlobalSelectors("h1,h2{font-size:2em}")).toBe(`${S} h1, ${S} h2{font-size:2em}`);
    expect(scopeGlobalSelectors("*,::before{box-sizing:border-box}")).toBe(
      `${S} *, ${S} ::before{box-sizing:border-box}`,
    );
  });
  test("selectors with a class, and :root variables, are left alone", () => {
    expect(scopeGlobalSelectors(".daisy-btn{color:red}")).toBe(".daisy-btn{color:red}");
    expect(scopeGlobalSelectors(":root{--radius:1rem}")).toBe(":root{--radius:1rem}");
    expect(scopeGlobalSelectors(".daisy-x:is(h1){a:1}")).toBe(".daisy-x:is(h1){a:1}");
  });
  test("the page root keeps the theme variables: :root, :where(:root) and [data-theme]", () => {
    expect(scopeGlobalSelectors(":where(:root),:root:not([data-theme]){--color-primary:red}")).toBe(
      ":where(:root), :root:not([data-theme]){--color-primary:red}",
    );
    expect(scopeGlobalSelectors("[data-theme=light]{--color-primary:blue}")).toBe(
      "[data-theme=light]{--color-primary:blue}",
    );
    expect(scopeGlobalSelectors("[hidden]{display:none!important}")).toBe(
      `${S} [hidden]{display:none!important}`,
    );
  });
  test("html and body apply to the extension's own wrapper, never to the page root", () => {
    expect(scopeGlobalSelectors("html{line-height:1.5}")).toBe(`${S}{line-height:1.5}`);
    expect(scopeGlobalSelectors("body{margin:0}")).toBe(`${S}{margin:0}`);
  });
  test("commas inside :where() and attribute selectors do not split the list", () => {
    expect(scopeGlobalSelectors('input:where([type="button"], [type="reset"]){a:1}')).toBe(
      `${S} input:where([type="button"], [type="reset"]){a:1}`,
    );
  });
  test("rules inside at-rules are scoped; keyframe steps and at-rule preludes are not", () => {
    expect(scopeGlobalSelectors("@media (x){button{a:1}}")).toBe(`@media (x){${S} button{a:1}}`);
    expect(scopeGlobalSelectors("@keyframes spin{from{a:1}to{a:2}}")).toBe(
      "@keyframes spin{from{a:1}to{a:2}}",
    );
    expect(scopeGlobalSelectors("@property --x{syntax:'*';inherits:false}")).toBe(
      "@property --x{syntax:'*';inherits:false}",
    );
  });
  test("nested rules are relative to an already-scoped parent and stay unchanged", () => {
    expect(scopeGlobalSelectors(".daisy-x{&:hover{a:1}:focus{b:2}}")).toBe(
      ".daisy-x{&:hover{a:1}:focus{b:2}}",
    );
  });
  test("strings with braces or semicolons do not confuse the scan", () => {
    expect(scopeGlobalSelectors('.daisy-x::after{content:"a{b};c"}h1{a:1}')).toBe(
      `.daisy-x::after{content:"a{b};c"}${S} h1{a:1}`,
    );
  });
  test("list items are trimmed and joined with ', '", () => {
    expect(scopeSelectorList("h1, .daisy-a , h2")).toBe(`${S} h1, .daisy-a, ${S} h2`);
  });
  test("a leading html or body is the wrapper, so body button reaches the kit's own buttons", () => {
    expect(scopeGlobalSelectors("body button{x:1}")).toBe(`${S} button{x:1}`);
    expect(scopeGlobalSelectors("html body button{x:1}")).toBe(`${S} button{x:1}`);
    expect(scopeGlobalSelectors("html > body > main{x:1}")).toBe(`${S} > main{x:1}`);
    expect(scopeGlobalSelectors("body > main{x:1}")).toBe(`${S} > main{x:1}`);
  });
  test("a root that is not a plain root is not mapped, and a class keeps its selector", () => {
    expect(scopeGlobalSelectors("body + p{x:1}")).toBe(`${S} body + p{x:1}`);
    expect(scopeGlobalSelectors("bodyx{x:1}")).toBe(`${S} bodyx{x:1}`);
    expect(scopeGlobalSelectors("html.dark body{x:1}")).toBe("html.dark body{x:1}");
    expect(scopeGlobalSelectors("body .btn{x:1}")).toBe("body .btn{x:1}");
  });
});
