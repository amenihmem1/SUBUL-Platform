/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
 
  console.log('Auth0 Action: Processing login for', event.user.email);
  

  let role = 'learner'; 
  
  if (event.user.user_metadata && event.user.user_metadata.role) {
    role = event.user.user_metadata.role;
    console.log('Auth0 Action: Found role in user_metadata:', role);
  } 
  else if (event.user.app_metadata && event.user.app_metadata.role) {
    role = event.user.app_metadata.role;
    console.log('Auth0 Action: Found role in app_metadata:', role);
  }
  // NEW: Try to get role from assigned roles
  else if (event.authorization.roles && event.authorization.roles.length > 0) {
    const roles = event.authorization.roles;
    console.log('Auth0 Action: Found assigned roles:', roles);
    
    if (roles.includes('admin')) {
      role = 'admin';
    } else if (roles.includes('employer')) {
      role = 'employer';
    } else if (roles.includes('learner')) {
      role = 'learner';
    }
    console.log('Auth0 Action: Selected role from assigned roles:', role);
  }
  else {
    console.log('Auth0 Action: No role found, using default:', role);
  }
  
  console.log('Auth0 Action: Extracted role:', role);
  
  const normalizedRole = role.toLowerCase();
  
  api.idToken.setCustomClaim('https://subul.uk.auth0.com/role', normalizedRole);
  api.idToken.setCustomClaim('https://subul.uk.auth0.com/roles', [normalizedRole]);
  api.idToken.setCustomClaim('https://subul.uk.auth0.com/isAdmin', normalizedRole === 'admin');
  api.idToken.setCustomClaim('https://subul.uk.auth0.com/isLearner', normalizedRole === 'learner');
  api.idToken.setCustomClaim('https://subul.uk.auth0.com/isEmployer', normalizedRole === 'employer');
  
  api.accessToken.setCustomClaim('https://subul.uk.auth0.com/role', normalizedRole);
  api.accessToken.setCustomClaim('https://subul.uk.auth0.com/roles', [normalizedRole]);
  api.accessToken.setCustomClaim('https://subul.uk.auth0.com/isAdmin', normalizedRole === 'admin');
  api.accessToken.setCustomClaim('https://subul.uk.auth0.com/isLearner', normalizedRole === 'learner');
  api.accessToken.setCustomClaim('https://subul.uk.auth0.com/isEmployer', normalizedRole === 'employer');
  
  console.log('Auth0 Action: Added role claims to tokens');
};
