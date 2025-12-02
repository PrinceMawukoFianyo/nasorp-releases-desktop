const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'actions/apiKeys.ts');
let content = fs.readFileSync(file, 'utf8');

// Replace the entire createAPIKey function with proper error handling
const fixedFunction = `export async function createAPIKey(name: string) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return {
        success: false,
        data: null,
        error: "You are Not Authorized",
      };
    }

    console.log("DEBUG - User creating API key:", {
      userId: user.id,
      email: user.email,
      orgId: user.orgId,
      orgName: user.orgName
    });

    // Validate that user has an organization
    let orgId = user.orgId;
    
    if (!orgId) {
      console.log("DEBUG - User has no orgId, finding or creating organization...");
      
      // Get the first organization
      let org = await db.organisation.findFirst();
      
      if (!org) {
        // Create a default organization
        org = await db.organisation.create({
          data: {
            name: user.orgName || "Default Organisation",
            slug: \`default-organisation-\${Date.now()}\`,
            currency: "USD",
            timezone: "UTC",
            inventoryStartDate: new Date(),
            fiscalYear: 1,
          },
        });
        console.log("DEBUG - Created new organization:", org.id);
      }
      
      orgId = org.id;
      
      // Update the user with the correct orgId
      await db.user.update({
        where: { id: user.id },
        data: { 
          orgId: org.id,
          orgName: org.name
        }
      });
      
      console.log("DEBUG - Updated user with orgId:", orgId);
    }

    // Verify the organization exists
    const organization = await db.organisation.findUnique({
      where: { id: orgId }
    });

    if (!organization) {
      console.error("DEBUG - Organization not found for orgId:", orgId);
      return {
        success: false,
        data: null,
        error: "Organization not found. Please contact administrator.",
      };
    }

    console.log("DEBUG - Organization found:", organization.name);

    // Generate API key
    const apiKey = generateAPIKey();

    // Check for duplicates
    const existingKey = await db.apiKey.findUnique({
      where: { key: apiKey },
    });

    if (existingKey) {
      return {
        success: false,
        data: null,
        error: "This Key Already exists",
      };
    }

    console.log("DEBUG - Creating API key for orgId:", orgId);
    
    // Create the API key with valid orgId
    const newApiKey = await db.apiKey.create({
      data: {
        orgId: orgId,
        key: apiKey,
        name,
        isActive: true,
      },
    });

    console.log("DEBUG - API key created successfully:", newApiKey.id);
    
    revalidatePath("/dashboard/integrations/api");

    return {
      success: true,
      data: newApiKey,
      error: null,
    };
  } catch (error) {
    console.error("Error creating API key:", error);
    
    // Provide more specific error messages
    let errorMessage = "Something went wrong";
    
    if (error.code === 'P2003') {
      errorMessage = "Foreign key constraint failed. The organization might not exist.";
    } else if (error.code === 'P2002') {
      errorMessage = "Duplicate key error. The API key already exists.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      data: null,
      error: errorMessage,
    };
  }
}`;

// Find and replace the createAPIKey function
const funcStart = content.indexOf('export async function createAPIKey(name: string) {');
if (funcStart !== -1) {
  // Find the end of the function
  let braceCount = 0;
  let funcEnd = -1;
  
  for (let i = funcStart; i < content.length; i++) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        funcEnd = i + 1;
        break;
      }
    }
  }
  
  if (funcEnd !== -1) {
    // Replace the function
    content = content.substring(0, funcStart) + fixedFunction + content.substring(funcEnd);
    console.log('✓ Replaced createAPIKey function');
  } else {
    console.log('⚠ Could not find end of function, appending fixed version...');
    content = content + '\n\n' + fixedFunction;
  }
} else {
  console.log('⚠ Could not find function, appending fixed version...');
  content = content + '\n\n' + fixedFunction;
}

fs.writeFileSync(file, content, 'utf8');
console.log('✓ Updated actions/apiKeys.ts with proper fix');
