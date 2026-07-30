# Changelog

Historial de cambios de SLM Bellavista Pesaje. El historial completo de versiones
anteriores a la 1.1.14 está en los [GitHub Releases](https://github.com/dogo3991-hash/Romana/releases)
del repositorio.

## 1.1.15

- Agrega el botón "Editar datos" en la tabla "En Espera" para corregir los datos
  de un camión (conductor, patente, transportista, N° guía, producto, traslado,
  hora de entrada) mientras sigue en espera del peso bruto, sin arriesgar el
  número de ticket (el correlativo lo genera la base de datos y nunca se
  sobrescribe al editar).

## 1.1.14

- Recuerda el último traslado elegido y lo propone por defecto en el próximo
  pesaje nuevo.
- Agrega el rol de usuario Expectador: solo lectura de pesajes, conductores,
  camiones y resúmenes, restringido a una única empresa, con descarga del
  informe de pesajes en cualquier rango de fechas.
