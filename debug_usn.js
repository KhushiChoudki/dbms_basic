const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Khushi/Desktop/DBMS/dbms_basic/.env' });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsnFormat() {
    console.log("Checking USN format in DB...");

    const { data, error } = await supabase
        .from('students')
        .select('usn')
        .limit(5);

    if (error) {
        console.error("Error querying students:", error.message);
    } else {
        console.log("Sample USNs from DB:", data);
        if (data.length > 0) {
            const sample = data[0].usn;
            console.log("Sample USN details:", {
                value: sample,
                length: sample.length,
                isUpperCase: sample === sample.toUpperCase(),
                charCodes: [...sample].map(c => c.charCodeAt(0))
            });
        }
    }
}

checkUsnFormat();
