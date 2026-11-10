```mermaid
classDiagram
    class Animal {
        +String name
        +move() void
    }
    class Dog {
        +bark() void
    }
    Animal <|-- Dog
```
