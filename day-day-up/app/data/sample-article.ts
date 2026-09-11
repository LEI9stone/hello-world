import type { ChapterData } from '../components/types';

/**
 * 示例文章：Go 语言参考手册前言部分。
 * 按“章节 -> 自然段 -> 句子”组织，段内按句展示「词流 + 中文翻译」。
 */
export const sampleArticle: ChapterData[] = [
  {
    id: 'introduction',
    heading: {
      word: {
        word: 'Introduction',
        phonetic: '/ˌɪntrəˈdʌʃn/',
        meaning: 'n. 引言；简介',
      },
      translation: '简介',
    },
    paragraphs: [
      {
        id: 'introduction-paragraph-1',
        sentences: [
          {
            id: 'p1-s1',
            text: 'This is the reference manual for the Go programming language.',
            translation: '这是Go编程语言的参考手册。',
            words: [
              { word: 'This', phonetic: '/ðɪs/', meaning: 'pron. 这' },
              { word: 'is', phonetic: '/ɪz/', meaning: 'v. 是' },
              { word: 'the', phonetic: '/ðə/', meaning: 'art. 这；该' },
              { word: 'reference', phonetic: '/ˈrefrəns/', meaning: 'n. 参考' },
              { word: 'manual', phonetic: '/ˈmænjuəl/', meaning: 'n. 手册' },
              { word: 'for', phonetic: '/fɔːr/', meaning: 'prep. 用于；关于' },
              { word: 'the', phonetic: '/ðə/', meaning: 'art. 这；该' },
              { word: 'Go', phonetic: '/ɡoʊ/', meaning: 'n. Go（语言名）' },
              {
                word: 'programming',
                phonetic: '/ˈproʊɡræmɪŋ/',
                meaning: 'n. 编程',
              },
              { word: 'language', phonetic: '/ˈlæŋɡwɪdʒ/', meaning: 'n. 语言' },
              { word: '.', phonetic: '', meaning: '', kind: 'symbol' },
            ],
          },
          {
            id: 'p1-s2',
            text: 'For more information and other documents, see https://go.dev/.',
            translation: '如需更多信息以及其他文档，请访问 https://go.dev/。',
            words: [
              { word: 'For', phonetic: '/fɔːr/', meaning: 'prep. 为了；有关' },
              { word: 'more', phonetic: '/mɔːr/', meaning: 'adj. 更多的' },
              {
                word: 'information',
                phonetic: '/ˌɪnfərˈmeɪʃn/',
                meaning: 'n. 信息',
              },
              { word: 'and', phonetic: '/ænd/', meaning: 'conj. 和' },
              { word: 'other', phonetic: '/ˈʌðər/', meaning: 'adj. 其他的' },
              {
                word: 'documents',
                phonetic: '/ˈdɑːkjəmənts/',
                meaning: 'n. 文档（复数）',
              },
              { word: ',', phonetic: '', meaning: '', kind: 'symbol' },
              { word: 'see', phonetic: '/siː/', meaning: 'v. 查阅；参见' },
              {
                word: 'https://go.dev/',
                phonetic: '',
                meaning: '',
                kind: 'link',
              },
              { word: '.', phonetic: '', meaning: '', kind: 'symbol' },
            ],
          },
        ],
      },
      {
        id: 'introduction-paragraph-2',
        sentences: [
          {
            id: 'p2-s1',
            text: 'Go is a general-purpose language designed with systems programming in mind.',
            translation: 'Go是一门面向系统编程设计的通用语言。',
            words: [
              { word: 'Go', phonetic: '/ɡoʊ/', meaning: 'n. Go语言' },
              { word: 'is', phonetic: '/ɪz/', meaning: 'v. 是' },
              { word: 'a', phonetic: '/ə/', meaning: 'art. 一种' },
              {
                word: 'general-purpose',
                phonetic: '/ˈdʒenrəl ˈpɜːrpəs/',
                meaning: 'adj. 通用的',
              },
              { word: 'language', phonetic: '/ˈlæŋɡwɪdʒ/', meaning: 'n. 语言' },
              {
                word: 'designed',
                phonetic: '/dɪˈzaɪnd/',
                meaning: 'v. 设计（过去分词）',
              },
              { word: 'with', phonetic: '/wɪð/', meaning: 'prep. 考虑；带有' },
              {
                word: 'systems',
                phonetic: '/ˈsɪstəmz/',
                meaning: 'n. 系统（复数）',
              },
              {
                word: 'programming',
                phonetic: '/ˈproʊɡræmɪŋ/',
                meaning: 'n. 编程',
              },
              { word: 'in', phonetic: '/ɪn/', meaning: 'prep. 在…之中' },
              { word: 'mind', phonetic: '/maɪnd/', meaning: 'n. 想法；头脑' },
              { word: '.', phonetic: '', meaning: '', kind: 'symbol' },
            ],
          },
          {
            id: 'p2-s2',
            text: 'It is strongly typed and garbage-collected and has explicit support for concurrent programming.',
            translation:
              '它是强类型语言，具备垃圾回收机制，并对并发编程提供原生明确支持。',
            words: [
              { word: 'It', phonetic: '/ɪt/', meaning: 'pron. 它' },
              { word: 'is', phonetic: '/ɪz/', meaning: 'v. 是' },
              {
                word: 'strongly',
                phonetic: '/ˈstrɔːŋli/',
                meaning: 'adv. 强烈地',
              },
              { word: 'typed', phonetic: '/taɪpt/', meaning: 'adj. 类型化的' },
              { word: 'and', phonetic: '/ænd/', meaning: 'conj. 并且' },
              {
                word: 'garbage-collected',
                phonetic: '/ˈɡɑːrbɪdʒ kəˈlektɪd/',
                meaning: 'adj. 带垃圾回收机制的',
              },
              { word: 'and', phonetic: '/ænd/', meaning: 'conj. 并且' },
              { word: 'has', phonetic: '/hæz/', meaning: 'v. 拥有' },
              {
                word: 'explicit',
                phonetic: '/ɪkˈsplɪsɪt/',
                meaning: 'adj. 明确的',
              },
              { word: 'support', phonetic: '/səˈpɔːrt/', meaning: 'n. 支持' },
              { word: 'for', phonetic: '/fɔːr/', meaning: 'prep. 对于' },
              {
                word: 'concurrent',
                phonetic: '/kənˈkɜːrənt/',
                meaning: 'adj. 并发的',
              },
              {
                word: 'programming',
                phonetic: '/ˈproʊɡræmɪŋ/',
                meaning: 'n. 编程',
              },
              { word: '.', phonetic: '', meaning: '', kind: 'symbol' },
            ],
          },
          {
            id: 'p2-s3',
            text: 'Programs are constructed from packages, whose properties allow efficient management of dependencies.',
            translation:
              '程序由包构建而成，包的特性可以实现对依赖项的高效管理。',
            words: [
              {
                word: 'Programs',
                phonetic: '/ˈproʊɡræmz/',
                meaning: 'n. 程序（复数）',
              },
              { word: 'are', phonetic: '/ɑːr/', meaning: 'v. 是' },
              {
                word: 'constructed',
                phonetic: '/kənˈstrʌktɪd/',
                meaning: 'v. 构建（过去分词）',
              },
              { word: 'from', phonetic: '/frʌm/', meaning: 'prep. 从…而来' },
              {
                word: 'packages',
                phonetic: '/ˈpækɪdʒɪz/',
                meaning: 'n. 包（复数）',
              },
              { word: ',', phonetic: '', meaning: '', kind: 'symbol' },
              { word: 'whose', phonetic: '/huːz/', meaning: 'pron. 它们的' },
              {
                word: 'properties',
                phonetic: '/ˈprɑːpərtiz/',
                meaning: 'n. 特性（复数）',
              },
              { word: 'allow', phonetic: '/əˈlaʊ/', meaning: 'v. 允许；使得' },
              {
                word: 'efficient',
                phonetic: '/ɪˈfɪʃnt/',
                meaning: 'adj. 高效的',
              },
              {
                word: 'management',
                phonetic: '/ˈmænɪdʒmənt/',
                meaning: 'n. 管理',
              },
              { word: 'of', phonetic: '/əv/', meaning: 'prep. …的' },
              {
                word: 'dependencies',
                phonetic: '/dɪˈpendənsiz/',
                meaning: 'n. 依赖项（复数）',
              },
              { word: '.', phonetic: '', meaning: '', kind: 'symbol' },
            ],
          },
        ],
      },
      {
        id: 'introduction-paragraph-3',
        sentences: [
          {
            id: 'p3-s1',
            text: 'The syntax is compact and simple to parse, allowing for easy analysis by automatic tools such as integrated development environments.',
            translation:
              '它的语法简洁，易于解析，方便集成开发环境这类自动化工具进行代码分析。',
            words: [
              { word: 'The', phonetic: '/ðə/', meaning: 'art. 该' },
              { word: 'syntax', phonetic: '/ˈsɪntæks/', meaning: 'n. 语法' },
              { word: 'is', phonetic: '/ɪz/', meaning: 'v. 是' },
              {
                word: 'compact',
                phonetic: '/kəmˈpækt/',
                meaning: 'adj. 简洁的',
              },
              { word: 'and', phonetic: '/ænd/', meaning: 'conj. 并且' },
              { word: 'simple', phonetic: '/ˈsɪmpl/', meaning: 'adj. 简单的' },
              { word: 'to', phonetic: '/tuː/', meaning: 'prep. 去；用于' },
              { word: 'parse', phonetic: '/pɑːrz/', meaning: 'v. 解析' },
              { word: ',', phonetic: '', meaning: '', kind: 'symbol' },
              {
                word: 'allowing',
                phonetic: '/əˈlaʊɪŋ/',
                meaning: 'v. 使得（现在分词）',
              },
              { word: 'for', phonetic: '/fɔːr/', meaning: 'prep. 带来' },
              { word: 'easy', phonetic: '/ˈiːzi/', meaning: 'adj. 容易的' },
              { word: 'analysis', phonetic: '/əˈnæləsɪs/', meaning: 'n. 分析' },
              { word: 'by', phonetic: '/baɪ/', meaning: 'prep. 由；借助' },
              {
                word: 'automatic',
                phonetic: '/ˌɔːtəˈmætɪk/',
                meaning: 'adj. 自动的',
              },
              {
                word: 'tools',
                phonetic: '/tuːlz/',
                meaning: 'n. 工具（复数）',
              },
              { word: 'such', phonetic: '/sʌtʃ/', meaning: 'adj. 这样的' },
              { word: 'as', phonetic: '/æz/', meaning: 'prep. 例如' },
              {
                word: 'integrated',
                phonetic: '/ˈɪntɪɡreɪtɪd/',
                meaning: 'adj. 集成的',
              },
              {
                word: 'development',
                phonetic: '/dɪˈveləpmənt/',
                meaning: 'n. 开发',
              },
              {
                word: 'environments',
                phonetic: '/ɪnˈvaɪrənmənts/',
                meaning: 'n. 环境（复数）',
              },
              { word: '.', phonetic: '', meaning: '', kind: 'symbol' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'notation',
    heading: {
      word: {
        word: 'Notation',
        phonetic: '/nəʊˈteɪʃn/',
        meaning: 'n. 记号；表示法',
      },
      translation: '记号规范',
    },
    paragraphs: [
      {
        id: 'notation-paragraph-1',
        sentences: [
          {
            id: 'p4-s1',
            text: 'The syntax is specified using a variant of Extended Backus-Naur Form (EBNF):',
            translation:
              '语法采用扩展巴科斯-诺尔范式（EBNF）的一种变体来定义：',
            words: [
              { word: 'The', phonetic: '/ðə/', meaning: 'art. 这；该' },
              { word: 'syntax', phonetic: '/ˈsɪntæks/', meaning: 'n. 语法' },
              { word: 'is', phonetic: '/ɪz/', meaning: 'v. 是' },
              {
                word: 'specified',
                phonetic: '/ˈspesɪfaɪd/',
                meaning: 'v. 指定，规定（过去分词）',
              },
              { word: 'using', phonetic: '/ˈjuːzɪŋ/', meaning: 'prep. 使用' },
              { word: 'a', phonetic: '/ə/', meaning: 'art. 一种' },
              { word: 'variant', phonetic: '/ˈveəriənt/', meaning: 'n. 变体' },
              { word: 'of', phonetic: '/əv/', meaning: 'prep. …的' },
              {
                word: 'Extended',
                phonetic: '/ɪkˈstendɪd/',
                meaning: 'adj. 扩展的',
              },
              {
                word: 'Backus-Naur',
                phonetic: '/ˌbækəs ˈnɔːə/',
                meaning: 'n. 巴科斯-诺尔',
              },
              { word: 'Form', phonetic: '/fɔːm/', meaning: 'n. 范式' },
              { word: '(EBNF):', phonetic: '', meaning: '', kind: 'symbol' },
            ],
            codeLang: 'text',
            code: [
              'Syntax      = { Production } .',
              'Production  = production_name "=" [ Expression ] "." .',
              'Expression  = Term { "|" Term } .',
              'Term        = Factor { Factor } .',
              'Factor      = production_name | token [ "..." token ] | Group | Option | Repetition .',
              'Group       = "(" Expression ")" .',
              'Option      = "[" Expression "]" .',
              'Repetition  = "{" Expression "}" .',
            ].join('\n'),
          },
          {
            id: 'p4-s2',
            text: 'Productions are expressions constructed from terms and the following operators, in increasing precedence:',
            translation:
              '产生式是由项以及下述运算符构成的表达式，优先级由低到高排列：',
            words: [
              {
                word: 'Productions',
                phonetic: '/prəˈdʌkʃnz/',
                meaning: 'n. 产生式（复数）',
              },
              { word: 'are', phonetic: '/ɑː/', meaning: 'v. 是' },
              {
                word: 'expressions',
                phonetic: '/ɪkˈspreʃnz/',
                meaning: 'n. 表达式（复数）',
              },
              {
                word: 'constructed',
                phonetic: '/kənˈstrʌktɪd/',
                meaning: 'v. 构建（过去分词）',
              },
              { word: 'from', phonetic: '/frəm/', meaning: 'prep. 由…构成' },
              { word: 'terms', phonetic: '/tɜːmz/', meaning: 'n. 项（复数）' },
              { word: 'and', phonetic: '/ænd/', meaning: 'conj. 和' },
              { word: 'the', phonetic: '/ðə/', meaning: 'art. 该' },
              {
                word: 'following',
                phonetic: '/ˈfɒləʊɪŋ/',
                meaning: 'adj. 下述的',
              },
              {
                word: 'operators',
                phonetic: '/ˈɒpəreɪtəz/',
                meaning: 'n. 运算符（复数）',
              },
              { word: ',', phonetic: '', meaning: '', kind: 'symbol' },
              { word: 'in', phonetic: '/ɪn/', meaning: 'prep. 按照' },
              {
                word: 'increasing',
                phonetic: '/ˈɪŋkriːsɪŋ/',
                meaning: 'adj. 递增的',
              },
              {
                word: 'precedence',
                phonetic: '/ˈpresɪdəns/',
                meaning: 'n. 优先级',
              },
              { word: ':', phonetic: '', meaning: '', kind: 'symbol' },
            ],
            codeLang: 'text',
            code: [
              '|   alternation',
              '()  grouping',
              '[]  option (0 or 1 times)',
              '{}  repetition (0 to n times)',
            ].join('\n'),
          },
          {
            id: 'p4-s3',
            text: '',
            translation: '',
            words: [
              {
                word: 'alternation',
                phonetic: '/ˌɔːltəˈneɪʃn/',
                meaning: 'n. 多选；备选分支',
              },
              {
                word: 'grouping',
                phonetic: '/ˈɡruːpɪŋ/',
                meaning: 'n. 分组；括号分组',
              },
              {
                word: 'option',
                phonetic: '/ˈɒpʃn/',
                meaning: 'n. 可选（出现0次或1次）',
              },
              {
                word: 'repetition',
                phonetic: '/ˌrepəˈtɪʃn/',
                meaning: 'n. 重复（出现0至n次）',
              },
            ],
          },
        ],
      },
      {
        id: 'notation-paragraph-2',
        sentences: [
          {
            id: 'p4-s4',
            text: 'Lowercase production names are used to identify lexical (terminal) tokens.',
            translation: '小写产生式名称用于标识词法（终结符）词元。',
            words: [
              {
                word: 'Lowercase',
                phonetic: '/ˌləʊəˈkeɪs/',
                meaning: 'adj. 小写的',
              },
              {
                word: 'production',
                phonetic: '/prəˈdʌkʃn/',
                meaning: 'n. 产生式',
              },
              {
                word: 'names',
                phonetic: '/neɪmz/',
                meaning: 'n. 名称（复数）',
              },
              { word: 'are', phonetic: '/ɑː/', meaning: 'v. 用于' },
              {
                word: 'used',
                phonetic: '/juːzd/',
                meaning: 'v. 使用（过去分词）',
              },
              { word: 'to', phonetic: '/tuː/', meaning: 'inf. 用来' },
              {
                word: 'identify',
                phonetic: '/aɪˈdentɪfaɪ/',
                meaning: 'v. 标识',
              },
              {
                word: 'lexical',
                phonetic: '/ˈleksɪkl/',
                meaning: 'adj. 词法的',
              },
              {
                word: '(terminal)',
                phonetic: '/ˈtɜːmɪnl/',
                meaning: 'adj. 终结的',
              },
              {
                word: 'tokens.',
                phonetic: '/ˈtəʊkənz/',
                meaning: 'n. 记号；词元（复数）',
              },
            ],
          },
        ],
      },
      {
        id: 'notation-paragraph-3',
        sentences: [
          {
            id: 'p4-s5',
            text: 'Non-terminals are in CamelCase.',
            translation: '非终结符采用驼峰命名。',
            words: [
              {
                word: 'Non-terminals',
                phonetic: '/ˌnɒn ˈtɜːmɪnlz/',
                meaning: 'n. 非终结符（复数）',
              },
              { word: 'are', phonetic: '/ɑː/', meaning: 'v. 是' },
              { word: 'in', phonetic: '/ɪn/', meaning: 'prep. 使用' },
              {
                word: 'CamelCase.',
                phonetic: '/ˈkæml keɪs/',
                meaning: 'n. 驼峰命名法',
              },
            ],
          },
        ],
      },
      {
        id: 'notation-paragraph-4',
        sentences: [
          {
            id: 'p4-s6',
            text: 'Lexical tokens are enclosed in double quotes "" or back quotes ``.',
            translation: '词法词元放在双引号 "" 或者反引号 `` 之中。',
            words: [
              {
                word: 'Lexical',
                phonetic: '/ˈleksɪkl/',
                meaning: 'adj. 词法的',
              },
              {
                word: 'tokens',
                phonetic: '/ˈtəʊkənz/',
                meaning: 'n. 词元（复数）',
              },
              { word: 'are', phonetic: '/ɑː/', meaning: 'v. 被' },
              {
                word: 'enclosed',
                phonetic: '/ɪnˈkləʊzd/',
                meaning: 'v. 包裹，括起（过去分词）',
              },
              { word: 'in', phonetic: '/ɪn/', meaning: 'prep. 在…之内' },
              { word: 'double', phonetic: '/ˈdʌbl/', meaning: 'adj. 双的' },
              {
                word: 'quotes',
                phonetic: '/kwəʊts/',
                meaning: 'n. 引号（复数）',
              },
              { word: '""', phonetic: '', meaning: '', kind: 'symbol' },
              { word: 'or', phonetic: '/ɔː/', meaning: 'conj. 或者' },
              { word: 'back', phonetic: '/bæk/', meaning: 'adj. 反的' },
              {
                word: 'quotes',
                phonetic: '/kwəʊts/',
                meaning: 'n. 引号（复数）',
              },
              { word: '``.', phonetic: '', meaning: '', kind: 'symbol' },
            ],
          },
        ],
      },
      {
        id: 'notation-paragraph-5',
        sentences: [
          {
            id: 'p4-s7',
            text: 'The form a ... b represents the set of characters from a through b as alternatives.',
            translation:
              '形如 a ... b 的写法，表示从字符 a 到字符 b 的全部字符作为可选分支。',
            words: [
              { word: 'The', phonetic: '/ðə/', meaning: 'art. 该' },
              { word: 'form', phonetic: '/fɔːm/', meaning: 'n. 形式' },
              { word: 'a ... b', phonetic: '', meaning: '', kind: 'symbol' },
              {
                word: 'represents',
                phonetic: '/ˌreprɪˈzents/',
                meaning: 'v. 表示',
              },
              { word: 'the', phonetic: '/ðə/', meaning: 'art. 该' },
              { word: 'set', phonetic: '/set/', meaning: 'n. 集合' },
              { word: 'of', phonetic: '/əv/', meaning: 'prep. …的' },
              {
                word: 'characters',
                phonetic: '/ˈkærəktəz/',
                meaning: 'n. 字符（复数）',
              },
              { word: 'from', phonetic: '/frəm/', meaning: 'prep. 从' },
              { word: 'a', phonetic: '/ə/', meaning: 'pron. a' },
              { word: 'through', phonetic: '/θruː/', meaning: 'prep. 直到' },
              { word: 'b', phonetic: '/biː/', meaning: 'pron. b' },
              { word: 'as', phonetic: '/æz/', meaning: 'prep. 作为' },
              {
                word: 'alternatives.',
                phonetic: '/ɔːlˈtɜːnətɪvz/',
                meaning: 'n. 备选项（复数）',
              },
            ],
          },
        ],
      },
      {
        id: 'notation-paragraph-6',
        sentences: [
          {
            id: 'p4-s8',
            text: 'The horizontal ellipsis ... is also used elsewhere in the spec to informally denote various enumerations or code snippets that are not further specified.',
            translation:
              '水平省略号 … 在规范文档其他地方也会非正式地表示各类枚举项或代码片段，这类内容不会进一步详细定义。',
            words: [
              { word: 'The', phonetic: '/ðə/', meaning: 'art. 该' },
              {
                word: 'horizontal',
                phonetic: '/ˌhɒrɪˈzɒntl/',
                meaning: 'adj. 水平的',
              },
              {
                word: 'ellipsis',
                phonetic: '/ɪˈlɪpsɪs/',
                meaning: 'n. 省略号',
              },
              { word: '...', phonetic: '', meaning: '', kind: 'symbol' },
              { word: 'is', phonetic: '/ɪz/', meaning: 'v. 被' },
              { word: 'also', phonetic: '/ˈɔːlsəʊ/', meaning: 'adv. 同样' },
              {
                word: 'used',
                phonetic: '/juːzd/',
                meaning: 'v. 使用（过去分词）',
              },
              {
                word: 'elsewhere',
                phonetic: '/ˈelsweə/',
                meaning: 'adv. 在别处',
              },
              { word: 'in', phonetic: '/ɪn/', meaning: 'prep. 在' },
              { word: 'the', phonetic: '/ðə/', meaning: 'art. 该' },
              {
                word: 'spec',
                phonetic: '/spek/',
                meaning: 'n. 规范文档（specification缩写）',
              },
              { word: 'to', phonetic: '/tuː/', meaning: 'inf. 用来' },
              {
                word: 'informally',
                phonetic: '/ɪnˈfɔːməli/',
                meaning: 'adv. 非正式地',
              },
              { word: 'denote', phonetic: '/dɪˈnəʊt/', meaning: 'v. 表示' },
              {
                word: 'various',
                phonetic: '/ˈveəriəs/',
                meaning: 'adj. 各类的',
              },
              {
                word: 'enumerations',
                phonetic: '/ɪˌnjuːməˈreɪʃnz/',
                meaning: 'n. 枚举列表（复数）',
              },
              { word: 'or', phonetic: '/ɔː/', meaning: 'conj. 或者' },
              { word: 'code', phonetic: '/kəʊd/', meaning: 'n. 代码' },
              {
                word: 'snippets',
                phonetic: '/ˈsnɪpɪts/',
                meaning: 'n. 代码片段（复数）',
              },
              { word: 'that', phonetic: '/ðæt/', meaning: 'rel. 这些' },
              { word: 'are', phonetic: '/ɑː/', meaning: 'v. 被' },
              { word: 'not', phonetic: '/nɒt/', meaning: 'adv. 不' },
              {
                word: 'further',
                phonetic: '/ˈfɜːðə/',
                meaning: 'adv. 进一步地',
              },
              {
                word: 'specified.',
                phonetic: '/ˈspesɪfaɪd/',
                meaning: 'v. 定义（过去分词）',
              },
            ],
          },
        ],
      },
      {
        id: 'notation-paragraph-7',
        sentences: [
          {
            id: 'p4-s9',
            text: 'The character … (as opposed to the three characters ...) is not a token of the Go language.',
            translation:
              '字符 …（注意区别于三个英文句点 ...）并不是 Go 语言的词元。',
            words: [
              { word: 'The', phonetic: '/ðə/', meaning: 'art. 该' },
              {
                word: 'character',
                phonetic: '/ˈkærəktə/',
                meaning: 'n. 字符',
              },
              { word: '…', phonetic: '', meaning: '', kind: 'symbol' },
              { word: '(as', phonetic: '/æz/', meaning: 'prep. 不同于' },
              {
                word: 'opposed',
                phonetic: '/əˈpəʊzd/',
                meaning: 'adj. 相反的',
              },
              { word: 'to', phonetic: '/tuː/', meaning: 'prep. 和…对比' },
              { word: 'the', phonetic: '/ðə/', meaning: 'art. 那' },
              { word: 'three', phonetic: '/θriː/', meaning: 'num. 三个' },
              {
                word: 'characters',
                phonetic: '/ˈkærəktəz/',
                meaning: 'n. 字符（复数）',
              },
              { word: '...)', phonetic: '', meaning: '', kind: 'symbol' },
              { word: 'is', phonetic: '/ɪz/', meaning: 'v. 是' },
              { word: 'not', phonetic: '/nɒt/', meaning: 'adv. 不是' },
              { word: 'a', phonetic: '/ə/', meaning: 'art. 一个' },
              { word: 'token', phonetic: '/ˈtəʊkən/', meaning: 'n. 词元' },
              { word: 'of', phonetic: '/əv/', meaning: 'prep. …的' },
              { word: 'the', phonetic: '/ðə/', meaning: 'art. 该' },
              { word: 'Go', phonetic: '/ɡəʊ/', meaning: 'n. Go' },
              {
                word: 'language.',
                phonetic: '/ˈlæŋɡwɪdʒ/',
                meaning: 'n. 语言',
              },
            ],
          },
        ],
      },
      {
        id: 'notation-paragraph-8',
        sentences: [
          {
            id: 'p4-s10',
            text: 'A link of the form [Go 1.xx] indicates that a described language feature (or some aspect of it) was changed or added with language version 1.xx and thus requires at minimum that language version to build.',
            translation:
              '形如 [Go 1.xx] 的链接标记，表示所描述的语言特性（或其部分功能）是在 Go 1.xx 版本新增或修改的，因此代码编译最低需要该版本。',
            words: [
              { word: 'A', phonetic: '/ə/', meaning: 'art. 一个' },
              { word: 'link', phonetic: '/lɪŋk/', meaning: 'n. 链接' },
              { word: 'of', phonetic: '/əv/', meaning: 'prep. …的' },
              { word: 'the', phonetic: '/ðə/', meaning: 'art. 该' },
              { word: 'form', phonetic: '/fɔːm/', meaning: 'n. 形式' },
              { word: '[Go 1.xx]', phonetic: '', meaning: '', kind: 'symbol' },
              {
                word: 'indicates',
                phonetic: '/ˈɪndɪkeɪts/',
                meaning: 'v. 表明',
              },
              { word: 'that', phonetic: '/ðæt/', meaning: 'conj. 该' },
              { word: 'a', phonetic: '/ə/', meaning: 'art. 一项' },
              {
                word: 'described',
                phonetic: '/dɪˈskraɪbd/',
                meaning: 'adj. 所描述的',
              },
              {
                word: 'language',
                phonetic: '/ˈlæŋɡwɪdʒ/',
                meaning: 'n. 语言',
              },
              { word: 'feature', phonetic: '/ˈfiːtʃə/', meaning: 'n. 特性' },
              { word: '(or', phonetic: '/ɔː/', meaning: 'conj. 或者' },
              { word: 'some', phonetic: '/sʌm/', meaning: 'adj. 部分' },
              { word: 'aspect', phonetic: '/ˈæspekt/', meaning: 'n. 方面' },
              { word: 'of', phonetic: '/əv/', meaning: 'prep. …的' },
              { word: 'it)', phonetic: '', meaning: '', kind: 'symbol' },
              { word: 'was', phonetic: '/wəz/', meaning: 'v. 被' },
              {
                word: 'changed',
                phonetic: '/tʃeɪndʒd/',
                meaning: 'v. 修改（过去分词）',
              },
              { word: 'or', phonetic: '/ɔː/', meaning: 'conj. 或者' },
              {
                word: 'added',
                phonetic: '/ˈædɪd/',
                meaning: 'v. 新增（过去分词）',
              },
              { word: 'with', phonetic: '/wɪð/', meaning: 'prep. 在' },
              {
                word: 'language',
                phonetic: '/ˈlæŋɡwɪdʒ/',
                meaning: 'n. 语言',
              },
              { word: 'version', phonetic: '/ˈvɜːʃn/', meaning: 'n. 版本' },
              { word: '1.xx', phonetic: '', meaning: '', kind: 'symbol' },
              { word: 'and', phonetic: '/ænd/', meaning: 'conj. 并且' },
              { word: 'thus', phonetic: '/ðʌs/', meaning: 'adv. 因此' },
              { word: 'requires', phonetic: '/rɪˈkwaɪəz/', meaning: 'v. 需要' },
              { word: 'at', phonetic: '/æt/', meaning: 'prep. 至少' },
              {
                word: 'minimum',
                phonetic: '/ˈmɪnɪməm/',
                meaning: 'n. 最低限度',
              },
              { word: 'that', phonetic: '/ðæt/', meaning: 'det. 该' },
              {
                word: 'language',
                phonetic: '/ˈlæŋɡwɪdʒ/',
                meaning: 'n. 语言',
              },
              { word: 'version', phonetic: '/ˈvɜːʃn/', meaning: 'n. 版本' },
              { word: 'to', phonetic: '/tuː/', meaning: 'inf. 用于' },
              { word: 'build.', phonetic: '/bɪld/', meaning: 'v. 编译' },
            ],
          },
        ],
      },
      {
        id: 'notation-paragraph-9',
        sentences: [
          {
            id: 'p4-s11',
            text: 'For details, see the linked section in the appendix.',
            translation: '详情请查看附录对应的链接小节。',
            words: [
              { word: 'For', phonetic: '/fɔː/', meaning: 'prep. 关于' },
              {
                word: 'details',
                phonetic: '/dɪˈteɪlz/',
                meaning: 'n. 详情（复数）',
              },
              { word: 'see', phonetic: '/siː/', meaning: 'v. 参见' },
              { word: 'the', phonetic: '/ðə/', meaning: 'art. 该' },
              {
                word: 'linked',
                phonetic: '/lɪŋkt/',
                meaning: 'adj. 链接对应的',
              },
              { word: 'section', phonetic: '/ˈsekʃn/', meaning: 'n. 小节' },
              { word: 'in', phonetic: '/ɪn/', meaning: 'prep. 在' },
              { word: 'the', phonetic: '/ðə/', meaning: 'art. 该' },
              {
                word: 'appendix.',
                phonetic: '/əˈpendɪks/',
                meaning: 'n. 附录',
              },
            ],
          },
        ],
      },
    ],
  },
];
