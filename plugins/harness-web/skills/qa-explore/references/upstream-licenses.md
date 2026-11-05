# Origen y licencias

`qa-explore` es una adaptación (no una copia literal) de dos skills con licencia MIT. Se conservan sus avisos.

| Fuente | Ruta | Commit | Qué se tomó |
|---|---|---|---|
| microsoft/cat-agent-skills (autor de la submission: Al Macey) | `submissions/browser-uat-analyst/SKILL.md` | `3678d23ad8fb8d098c428302a98044ac9514d5a1` | Charter, preparación, escenarios + pase adversarial, ledger de evidencia, separación esperado/observado, clasificación de fallos, `BLOCKED` ≠ `PASS`, formato de respuesta |
| PramodDutta/qaskills | `seed-skills/qa-agent-claude/SKILL.md` | `6ea7d5627f94b5c050346d3f70c3bccfed00c0eb` | Exploración inicial, recorridos priorizados por riesgo, regla de no debilitar un test para ocultar un defecto |

Se omitió: secciones específicas de Copilot Studio/Power Platform y de presentaciones (UAT Analyst); auto-reparación de tests y bucle hasta verde (QA Agent), porque el explorador no modifica código.

## microsoft/cat-agent-skills

```
MIT License

Copyright (c) Microsoft Corporation.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE
```

## PramodDutta/qaskills

```
MIT License

Copyright (c) 2026 Pramod Dutta (The Testing Academy)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
