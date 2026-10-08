SET NAMES utf8mb4;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','requester','support') NOT NULL,
  department VARCHAR(100) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Un usuario de soporte puede atender varias categorías
CREATE TABLE support_categories (
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  PRIMARY KEY (user_id, category_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category_id INT NOT NULL,
  impact ENUM('low','medium','high') NOT NULL,
  priority ENUM('low','medium','high','critical') NOT NULL,   -- la elige el solicitante (dropdown "Urgencia")
  status ENUM('open','in_progress','waiting_user','resolved','closed') NOT NULL DEFAULT 'open',
  requester_id INT NOT NULL,
  assigned_to INT NULL,
  resolution_cause TEXT NULL,
  resolution_fix TEXT NULL,
  resolved_at DATETIME NULL,
  resolved_by INT NULL,
  notify_email TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_requester (requester_id),
  INDEX idx_assigned (assigned_to),
  INDEX idx_status (status),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (requester_id) REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=2001;

CREATE TABLE ticket_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  actor_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  detail TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (actor_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  author_id INT NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (author_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,       -- nombre original
  stored_name VARCHAR(255) NOT NULL,    -- nombre en disco
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
