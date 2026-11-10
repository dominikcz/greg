```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Busy: start
    state Busy {
        [*] --> Working
        Working --> [*]
    }
    Busy --> [*]
```
