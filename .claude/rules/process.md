# rules/process.md

Cómo se trabaja con el usuario en una sesión. Complementa `rules/spec-first.md`:
aquel fija qué documentos hacen falta; este fija cuánto se hace y cuándo se pregunta.

## Si la instrucción es ambigua, se pregunta

Si una instrucción admite dos lecturas razonables (por ejemplo «regístralo al hacer T-016»:
¿ahora o cuando llegue esa tarea?), se pregunta **antes** de implementar. No se interpreta ni
se elige la lectura que más trabajo da.

## No se hace más de lo que se pide

- Se hace lo pedido, nada más. Si se ve algo que conviene arreglar, se anota como tarea nueva
  pendiente (en la review, o como `sdd/tasks/T-xxx.md` si hace falta) y no se hace.
- Corregir un defecto que impide cumplir el criterio de aceptación de la tarea en curso no es
  «más trabajo»: va en la tarea y se dice en la review.
- Cada tarea cubre sus CA. Un cambio de otra capa es otra tarea.

## Antes de cada commit

Se comprueba que se ha hecho exactamente lo pedido:

1. El contenido del commit coincide con la petición (ni archivos de más ni de menos).
2. Lo que se desvía de la petición se dice al usuario, con el motivo.
3. `git status --short` no deja cambios sin explicar.
4. Las puertas de la tarea se han pasado y su salida está en la review.

## Cuando algo ya está decidido

Antes de dar por pendiente una decisión, se busca si ya está registrada (ADR, plan §5b,
enmienda de la spec, review). Si lo está, se enseña dónde y no se vuelve a registrar.
