Build a Tweak application with an admin web dashboard.

Requirements:

Authentication & Key System

The admin dashboard must allow generating registration keys.

Users can only register/login with a valid key.

Include logging of all key generations and logins.

Admin Management

Admins can add/remove other admins.

Admins can see who is currently online in the application.

Admins can reset/change passwords for users.

Admins can view the live screen of a selected user.

Admins can execute commands on a user’s machine remotely.

Application Behavior

The application must differentiate between admin accounts and normal user accounts.

If the logged-in account is admin, the application shows an admin-specific UI after login.

If it’s a normal user, they only see the tweak features.

User Side (Tweak features)

Normal users should only see the tweak functionalities.

The tweak part can be expandable, feel free to suggest or add useful features.

Database Integration

Use MariaDB for all authentication, logging, and data storage.

Logging

Maintain a detailed log system for:

Key generation

Logins

Actions by admins

Commands executed on user machines

Deliverables:

Full admin web dashboard (React + Node.js backend preferred, but suggest if another stack is better).

Full desktop application (Electron, or another suitable framework).

Documentation on:

How to run the project locally.

How to deploy the project.

What each part does and how it works.

Extra:

If you think of any useful additional features (e.g., analytics, role-based permissions, better security layers), feel free to add them.