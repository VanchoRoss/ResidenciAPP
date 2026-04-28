# ResidenciAPP Tutor v2

Esta versión separa claramente dos modos:

- **Aprender desde cero**: nodos de estudio narrativos, organizados por eje, con buscador por palabra clave.
- **Entrenamiento / Simulacro**: sprints con preguntas asociadas al banco, práctica libre sin tiempo o simulacro cronometrado.

## Cambios principales

1. Los nodos no mezclan preguntas por coincidencia automática amplia. Cada nodo usa sus preguntas explícitas del material cargado (`explicitQuestionIds`).
2. Los sprints mantienen sus preguntas asociadas originales.
3. Se agregó splash screen con logo.
4. Se agregó modo práctica libre y modo simulacro.
5. El simulacro calcula el tiempo total: cantidad de preguntas × tiempo elegido por pregunta.
6. El modo estudio puede expandirse para lectura más cómoda.
7. Los nodos se agrupan por eje y tienen búsqueda por palabra clave.
8. El menú lateral tiene scroll para web y celular.

## Uso recomendado

- Para aprender un tema: `Aprender desde cero` → elegir eje → leer nodo → preguntas del nodo.
- Para entrenar rendimiento: `Panel principal` → elegir sprint → `Simulacro`.
- Para practicar sin presión: `Panel principal` → elegir sprint → `Práctica libre`.
