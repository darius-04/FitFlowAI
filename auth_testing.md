# Auth Testing Playbook (FitFlow AI)

## MongoDB Verification
```
mongosh
use fitflow_ai
db.users.find({}).pretty()
db.users.findOne({email: "admin@fitflow.ai"}, {password_hash: 1})
db.users.getIndexes()    # email unique
db.login_attempts.getIndexes()
db.password_reset_tokens.getIndexes()
```
Verify: bcrypt hash starts with `$2b$`, `email` is unique, TTL on `password_reset_tokens.expires_at`.

## API Testing (Bearer Token mode for mobile)
```
# Register
curl -X POST $URL/api/auth/register -H "Content-Type: application/json" \
  -d '{"email":"u1@test.com","password":"Passw0rd!","name":"User One"}'
# returns { user, access_token, refresh_token }

# Login
curl -X POST $URL/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"u1@test.com","password":"Passw0rd!"}'

# /me
curl $URL/api/auth/me -H "Authorization: Bearer <token>"

# Logout (no-op server-side; client clears)
curl -X POST $URL/api/auth/logout -H "Authorization: Bearer <token>"
```

Brute force: 5 wrong attempts within 15 min returns 429.
