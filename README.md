[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][github-image]][github-url]
[![Test Coverage][coveralls-image]][coveralls-url]

# @flemist/test-variants

TypeScript библиотека для комбинаторного рандомизированного тестирования - запускает тестовую функцию со всеми возможными комбинациями параметров

## Термины

- `тест` - функция, которая тестируется с разными комбинациями параметров
- `createTestVariants` - функция, которая создает функцию testVariants
- `testVariants` - функция, которая запускает тест с перебором комбинаций параметров
- `вариант` - конкретная комбинация параметров для теста
- `шаблон параметров` - объект, в котором каждому параметру теста соответствует массив возможных значений
- `seed` - значение для инициализации псевдослучайного генератора внутри теста, для воспроизводимости рандомизированных тестов
- `итерация` - один запуск теста с конкретной комбинацией параметров
- `итерирование` - перебор комбинаций параметров (прямой, обратный, случайный)
- `асинхронная итерация` - итерация, в которой тестовая функция возвращает Promise
- `синхронная итерация` - итерация, в которой тестовая функция возвращает void или значение
- `режим итерирования` - способ перебора вариантов (прямой, обратный, случайный)
- `полный перебор` - когда все возможные в рамках ограничений варианты параметров были использованы хотя бы по одному разу (возможен только для прямого и обратного режимов итерирования)
- `попытки варианта` - количество запусков теста с одним и тем же вариантом параметров до перехода к следующему варианту
- `цикл` - полный перебор всех вариантов параметров
вариантов, количество полных переборов, количество попыток варианта)
- `лучшая ошибка` - ошибка, которая произошла на наименьшем в лексикографическом порядке варианте параметров, т.е. самая удобная для отладки
- `IAbortSignalFast` - интерфейс для прерывания асинхронных операций (см. @flemist/abort-controller-fast)

## Публичное API

```ts
// создает функцию для запуска тестов с перебором всех комбинаций параметров
// в параметры передается функция теста, она может быть: синхронной, асинхронной или гибридной
const testVariants = createTestVariants(async (
  // параметры теста, которые будут перебираться
  {
    arg1,
    arg2,
    arg3,
    seed,
  }: {
    arg1: Type1,
    arg2: Type2,
    arg3: Type3,
    // seed генерируется автоматически или функцией getSeed,
    // может быть любого типа: число, строка, объект, функция и т.д.
    // предназначен для псевдослучайного генератора и воспроизводимости рандомизированных тестов
    seed?: number | null,
  },
  abortSignal: IAbortSignalFast,
) => {
  // тело теста

  // возвращает: void | number | { iterationsAsync: number, iterationsSync: number }
  // возвращай iterationsAsync и iterationsSync, если нужно посчитать общее количество
  // асинхронных и синхронных итераций внутри теста
  // number равносилен iterationsSync
})
  
const result = await testVariants({
  // шаблоны параметров
  arg1: [value1, value2, value3],
  arg2: (args) => [valueA, valueB],  // args: { arg1 } - уже присвоенные параметры
  arg3: [valueX],
})({
  // все параметры опциональны
  // отсутствующие значения или null означают, что используется значение по умолчанию

  // автоматической сборка мусора после N итераций или через интервал времени
  // полезно для предотвращения timeout в karma для синхронных тестов,
  // или предотвращения зависаний в Node.js из-за багов с Promise
  GC_Iterations: number,      // default: 1000000
  GC_IterationsAsync: number, // default: 10000
  GC_Interval: number,        // default: 1000 (milliseconds)

  // параметры вывода в консоль. default: true
  log: true, // все параметры вывода в консоль по умолчанию
  log: boolean | {
    // сообщение о начале теста
    start: boolean,           // default: true
    // каждые N миллисекунд показыввает информацию о прогрессе и статистику
    progressInterval: number, // default: 5000 (milliseconds)
    // сообщение о начале теста
    completed: boolean,       // default: true
    // полный лог ошибки вместе со stack trace
    error: boolean,           // default: true
    // сообщение о смене режима итерирования, с информацией о текущем режиме
    modeChange: boolean,      // default: true
  },

  // для прерывания асинхронных операций внутри теста
  abortSignal: IAbortSignalFast,

  // параллельное выполнение (для асинхронных тестов)
  parallel: boolean | number, // default: 1 - no parallel
  parallel: true,             // все параллельно
  parallel: 4,                // максимум 4 параллельно
  parallel: false | 1,        // последовательно

  // Общие лимиты
  // максимальное суммарное количество запущенных тестов (с учетом repeatsPerVariant)
  limitVariantsCount: number, // default: null - unlimited (TODO: rename to limitTests)
  // максимальное время работы всего testVariants
  limitTime: number,          // default: null - unlimited, (milliseconds)
  // тест завершается, если следующие условия выполнятся для всех режимов итерирования:
  // 1) для `forward` и `backward` - количество полных переборов всех вариантов достигло cycles
  // 2) для `random` - количество перебраных вариантов достигло cycles (без учета repeatsPerVariant)
  // пока эти условия не выполнены, режимы итерирования будут сменять друг друга по кругу
  cycles: 3,

  // режимы итерирования (перебора вариантов). default: forward // TODO: rename to iterationModes
  modes: [
    {
      // лексикограцический перебор вариантов (как числовой счет)
      // от первого (самый последний аргумент в шаблоне)
      // до последнего (самый первый аргумент в шаблоне) либо до достижения ограничений
      mode: 'forward',
      // количество тестов каждого варианта перед тем как перейти к следующему варианту
      repeatsPerVariant: number, // default: 1 (TODO: rename to attemptsPerVariant)
      // максимально количество понытных полных переборов всех вариантов, до смены режима
      cycles: number,            // default: 1
      // максимальное время работы до смены режима
      limitTime: number,         // default: null - unlimited, (milliseconds)
      // максимальное количество запущенных тестов до смены режима (с учетом repeatsPerVariant)
      limitCount: number,        // default: null - unlimited (TODO: rename to limitTests)
    },
    {
      // лексикограцический перебор вариантов в обратном порядке
      // от последнего возможного или от текущего ограничения до первого варианта
      // те же параметры что и для 'forward'
      mode: 'backward',
      cycles: number,
      repeatsPerVariant: number,
      limitTime: number,
      limitPickCount: number, // (TODO: rename to limitTests)
    },
    {
      // случайный перебор вариантов в рамках текущих ограничений
      mode: 'random',
      limitTime: 10000,
      limitPickCount: 1000, // (TODO: rename to limitTests)
    },
  ],

  // Режимы итерирования целесообразно использовать в тандеме поиском лучшей ошибки
  // Лучшей ошибкой считается ошибка та которая произошла на наименьшем в лексикографическом порядке варианте
  // В идеале лучшей ошибкой будет вариант со значениями всех аргументов
  // равными первому значению в шаблоне
  // Поиск производится путем многократного итерирования и введения новых ограничений
  // при обнаружении ошибки, таким образом количество вариантов все время уменьшается,
  // а тесты выполняются все быстрее
  findBestError: {
    equals: (a, b) => boolean,
    // указыввет, что значения каждого аргумента не должно превышать
    // значения аргумента последнего варианта вызвавшего ошибку
    limitArgOnError: boolean | Function,  // default: false
    limitArgOnError: true,                // правило применяется ко всем аргументам
    // кастомное правило, ограничивать ли значение аргумента
    limitArgOnError: ({
      name,          // имя аргумента
      valueIndex,    // индекс значения аргумента в шаблоне
      values,        // все возможные значения аргумента в шаблоне
      maxValueIndex, // индекс значения аргумента в шаблоне вызвавшего ошибку
    }) => boolean,
    // следующее равносильно limitArgOnError: true
    limitArgOnError: ({ valueIndex, maxValueIndex }) => valueIndex >= maxValueIndex,
  
    // опция предназначена только для проверки системы
    // если true, итерирование будет включать в себя последний ошибочный вариант
    includeErrorVariant: boolean, // default: false
    
    // если true, то при завершении всего testVariants, если была найдена ошибка,
    // то не будет выброшено исключение, а вместо этого
    // вся информация об ошибке будет возвращена в результате
    dontThrowIfError: false,
  },

  // генерация seed для псевдослучайного генератора
  // seed будет подставлен в параметры теста как поле seed, даже если он null или undefined
  // в дальнейшем этот seed будет использован для точного воспроизведения псевдослучайного поведения внутри теста
  getSeed: ({ // default: null - seed отключен, и не устанавливается в аргументы теста
    // (TODO: rename to tests) - общее количество запущенных тестов
    variantIndex,
    // (TODO: rename to cycles) - количество полных переборов всех вариантов
    cycleIndex,
    // (TODO: rename to repeats) - количество повторов текущего варианта
    repeatIndex,
  }) => any,
  getSeed: () => Math.random() * 0xFFFFFFFF, // пример - случайный числовой seed

  // Сохранение ошибочных вариантов в файлы для последующих проверок
  // или продолжения поиска лучших ошибок
  // Перед перебором всех вариантов, сначала будут проверены сохраненные варианты из файлов
  // в порядке убывания их даты сохранения (сначала самые свежие)
  saveErrorVariants: {
    dir: './error-variants',
    // Максимлаьное количество проверок каждого сохраненного варианта
    // Полезно когда ошибка воспроизводится не с первого раза
    // из-за не зависящих от параметров или случайного генератора факторов
    // Если ошибка найдена, то по-умолчанию бросается исключение и testVariants завершается
    retriesPerVariant: 1, // default: 1 (TODO: rename to attemptsPerVariant)
    // Кастомная генерация пути к файлу для сохранения варианта
    // Либо относительно папки dir, либо абсолютный путь
    // default: 2025-12-30_12-34-37_vw3h626wg7m.json
    getFilePath: ({ sessionDate }) => string | null,
    // Кастомная сериализация, на случай если аргументами являются экземпляры классов
    argsToJson: (args) => string | SavedArgs,
    // Кастомная десериализация
    jsonToArgs: (json) => Args,
    // Если true и включен findBestError, то проверяются все файлы,
    // собираются все ошибки из них и используются как начальные ограничения для findBestError
    // Полезно, когда нужно продолжить поиск лучшей ошибки после перезапуска testVariants
    useToFindBestError: false,
  },

  // Вызывается при возникновении ошибки в тесте
  // до логирования и бросания исключения
  onError: ({
    error,  // сама ошибка пойманная через try..catch
    args,   // параметры теста вызвавшие ошибку
    index,  // количество запущенных тестов до ошибки (с учетом repeatsPerVariant) TODO: rename to tests
  }) => void | Promise<void>,
  
  // @deprecated мусор, удалить, заменить на log.error
  logError: true,
  
  // контроллер времени для всех внутренних задержек, таймаутов и получения текущего времени
  // используется внутри testVariants вместо прямого вызова setTimeout, Date.now и т.д.
  // предназначен только для тестирования и отладки самой библиотеки test-variants
  timeController: ITimeController, // default: null - use timeControllerDefault
})

// result:
{
  iterations: number,
  // найденная лучшая ошибка, если включен findBestError и выключен dontThrowIfError
  bestError: null | {
    error: any, // сама ошибка пойманная через try..catch
    args: { // параметры теста вызвавшие ошибку
      arg1: Type1,
      arg2: Type2,
      arg3: Type3,
      seed?: number | null,
    },
    index: number, // количество запущенных тестов до ошибки (с учетом repeatsPerVariant) TODO: rename to tests
  },
}
```

# License

[Unlimited Free](LICENSE)

[npm-image]: https://img.shields.io/npm/v/@flemist/test-variants.svg
[npm-url]: https://npmjs.org/package/@flemist/test-variants
[downloads-image]: https://img.shields.io/npm/dm/@flemist/test-variants.svg
[downloads-url]: https://npmjs.org/package/@flemist/test-variants
[github-image]: https://github.com/NikolayMakhonin/test-variants/actions/workflows/test.yml/badge.svg
[github-url]: https://github.com/NikolayMakhonin/test-variants/actions
[coveralls-image]: https://coveralls.io/repos/github/NikolayMakhonin/test-variants/badge.svg
[coveralls-url]: https://coveralls.io/github/NikolayMakhonin/test-variants
