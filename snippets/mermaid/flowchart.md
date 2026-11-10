```mermaid
flowchart LR
    A[Start] --> B{Decision}
    B -->|yes| C(Process)
    B -->|no| D[(Database)]
    subgraph Group
        C --> E([Done])
    end
    D --> E
```
