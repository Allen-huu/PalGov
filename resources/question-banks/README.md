# 题库 JSON 生成提示词

将以下提示词发送给 DeepSeek 或其他大模型，即可生成符合格式的题库 JSON 文件。

---

## 提示词模板

```
请帮我生成一份题库 JSON 文件，格式要求如下：

{
  "name": "题库名称",
  "description": "题库描述",
  "questions": [
    {
      "id": "唯一标识（如 cs001）",
      "type": "题目类型：single_choice（单选）| multiple_choice（多选）| true_false（判断）| short_answer（简答）",
      "question": "题目文本",
      "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
      "answer": 0,
      "explanation": "详细解析，说明为什么选这个答案",
      "difficulty": "easy | medium | hard",
      "tags": ["标签1", "标签2"]
    }
  ]
}

字段说明：
- id: 题目唯一标识，建议用英文前缀+数字
- type: 题目类型
  - single_choice: 单选题（answer 为正确选项索引，从 0 开始）
  - multiple_choice: 多选题（answer 为正确选项索引数组，如 [0, 2]）
  - true_false: 判断题（options 为 ["正确", "错误"]，answer 为 0 或 1）
  - short_answer: 简答题（options 为空数组，answer 为参考答案文本）
- question: 题目文本
- options: 选项列表，简答题填空数组 []
- answer: 正确答案
  - 单选/判断：索引数字
  - 多选：索引数组 [0, 2]
  - 简答：文本字符串
- explanation: 详细解析
- difficulty: easy / medium / hard
- tags: 分类标签数组

请生成 [数量] 道关于 [主题] 的题目，难度为 [难度]。
```

---

## 示例题库

参见 `resources/question-banks/computer-science.json`。