graph LR
    %% --- Theme & Config ---
    %%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#ffffff', 'edgeLabelBackground':'#ffffff', 'tertiaryColor': '#f4f4f4'}}}%%
    
    classDef frontend fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,rx:5,ry:5;
    classDef backend fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,rx:5,ry:5;
    classDef db fill:#e0f2f1,stroke:#00695c,stroke-width:2px,rx:5,ry:5;
    classDef hardware fill:#fff3e0,stroke:#e65100,stroke-width:2px,rx:5,ry:5;
    classDef actor fill:#eceff1,stroke:#37474f,stroke-width:2px,circle;

    %% ==========================================
    %% 1. FRONTEND LAYER (Left)
    %% ==========================================
    subgraph Frontend_Scope ["💻 Client Side (Frontend)"]
        direction TB
        User(("👤 User"))
        
        subgraph React_App ["React Application"]
            direction TB
            Nav[Navbar / Sidebar]
            
            subgraph Pages ["View Layer"]
                direction TB
                P1[Login / Auth]
                P2[Dashboard & Monitor]
                P3[Linen Operations]
                P4[Reports & Requests]
                P5[Admin & Settings]
            end
            
            Axios["📡 Axios Client"]
        end
    end

    %% ==========================================
    %% 2. BACKEND LAYER (Center)
    %% ==========================================
    subgraph Backend_Scope ["⚙️ Server Side (Backend)"]
        direction TB
        API_Gateway["🌐 Web API Host"]
        
        subgraph Controller_Layer ["API Controllers"]
            direction TB
            C_Auth[Auth & User]
            C_Ops[Operations: Linen/Req/Laundry]
            C_Master[Master Data: Vendor/Hosp]
            C_Device[Hardware: Reader]
            C_Report[Reports & Analytics]
        end
        
        subgraph Service_Layer ["Business Logic"]
            direction TB
            Logic[Core Logic Services]
            Email[✉️ Email Service]
        end
        
        EF[Entity Framework Core]
    end

    %% ==========================================
    %% 3. DATA & HARDWARE (Right & Bottom)
    %% ==========================================
    subgraph Data_Scope ["💾 Data Layer"]
        direction TB
        DB[("🐘 PostgreSQL")]
    end

    subgraph Hardware_Scope ["📡 IoT Hardware"]
        direction TB
        Reader["📟 RFID Readers"]
        Tags["🏷️ RFID Tags"]
    end

    %% ==========================================
    %% CONNECTIVITY FLOWS
    %% ==========================================
    
    %% User Flow
    User ==> P1
    
    %% Frontend Internal
    Pages --> Nav
    Pages --> Axios
    
    %% Client to Server
    Axios == "HTTPS / JSON" ==> API_Gateway
    
    %% Backend Processing
    API_Gateway --> Controller_Layer
    
    %% Controller Routing
    C_Auth --> Logic
    C_Ops --> Logic
    C_Master --> Logic
    C_Report --> Logic
    
    %% Logic & Services
    C_Ops -.-> Email
    Logic --> EF
    
    %% Hardware Interaction
    Tags -.-> |"UHF Signal"| Reader
    Reader == "TCP/IP" ==> C_Device
    C_Device --> Logic
    
    %% Database Interaction
    EF == "Query / Save" ==> DB
    
    %% Email Out
    Email -.-> |"SMTP"| User

    %% ==========================================
    %% STYLING APPLICATION
    %% ==========================================
    class P1,P2,P3,P4,P5,Axios,Nav,React_App frontend;
    class API_Gateway,C_Auth,C_Ops,C_Master,C_Device,C_Report,Logic,Email,EF backend;
    class DB db;
    class Reader,Tags hardware;
    class User actor;