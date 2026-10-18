// Data mapper to transform backend API response to dashboard format

/**
 * Maps backend user object to dashboard user format
 * @param {Object} backendUser - User object from backend API
 * @returns {Object} Transformed user object for dashboard
 */
function mapBackendUser(backendUser) {
    // Calculate age from birthDate
    const calculateAge = (birthDate) => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    // Calculate profile completion percentage
    const calculateProfileCompletion = (user) => {
        const fields = [
            user.firstImageId,
            user.basicDetails?.name,
            user.basicDetails?.gender,
            user.basicDetails?.birthDate,
            user.basicDetails?.height,
            user.bio,
            user.desiredQualities?.lookingFor,
            user.curatedProfile?.aboutMe,
            user.curatedProfile?.personalityTraits?.length > 0,
            user.curatedProfile?.interests?.length > 0
        ];

        const filledFields = fields.filter(field => field !== null && field !== undefined).length;
        return Math.round((filledFields / fields.length) * 100);
    };

    // Map onboarding status to dashboard status
    const mapStatus = (onboardingStatus, isVerified) => {
        if (onboardingStatus === 'COMPLETED' || onboardingStatus === 'CONTEXT_STORED') {
            return 'active';
        } else if (onboardingStatus === 'PENDING' || onboardingStatus === 'IN_PROGRESS') {
            return 'inactive';
        } else {
            return 'waitlisted';
        }
    };

    // Format location from coordinates
    const formatLocation = (location) => {
        if (!location?.x || !location?.y) return 'Location not set';
        // You could integrate a reverse geocoding API here if needed
        return `${location.y.toFixed(4)}°N, ${location.x.toFixed(4)}°E`;
    };

    // Extract college/university from professional details or email
    // Extract college/university from professional details or email
    const extractCollege = (user) => {
        if (user.professionalDetails?.university) {
            return user.professionalDetails.university;
        }
        if (user.college && user.college !== 'Not specified') {
            return user.college;
        }
        if (typeof user.professionalDetails === 'string') {
            return user.professionalDetails;
        }
        // Try to extract from email domain
        const emailDomain = user.email?.split('@')[1];
        if (emailDomain) {
            const domainParts = emailDomain.split('.');
            return domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
        }
        return 'Not specified';
    };

    // Extract work/company mirroring UserPayloadMapper
    const extractWork = (user) => {
        const pro = user.professionalDetails;
        if (pro && typeof pro === 'object') {
            if (pro.titleCompany && pro.companyName) {
                return `${pro.titleCompany} at ${pro.companyName}`;
            }
            if (pro.companyName) return pro.companyName;
            if (pro.titleCompany) return pro.titleCompany;
        }
        return user.work || '';
    };

    // Extract rich bio mirroring UserPayloadMapper
    const extractRichBio = (user) => {
        const signals = user.signalProfile || {};
        const curated = user.curatedProfile || {};
        return curated.aboutMe || signals.lifestyleTexture || signals.lifeEnergy || user.bio || '';
    };

    // Extract all uploaded photos (up to 4 slots)
    const extractPhotos = (user) => {
        const photos = [];
        if (user.firstImageId) photos.push({ id: user.firstImageId, slot: 1 });
        if (user.secondImageId) photos.push({ id: user.secondImageId, slot: 2 });
        if (user.thirdImageId) photos.push({ id: user.thirdImageId, slot: 3 });
        if (user.fourthImageId) photos.push({ id: user.fourthImageId, slot: 4 });
        if (Array.isArray(user.imageIds)) {
            user.imageIds.forEach((imgId) => {
                if (imgId && !photos.some(p => p.id === imgId)) {
                    photos.push({ id: imgId, slot: photos.length + 1 });
                }
            });
        }
        return photos;
    };

    const age = calculateAge(backendUser.basicDetails?.birthDate);
    const college = extractCollege(backendUser);
    const work = extractWork(backendUser);
    const bio = extractRichBio(backendUser);
    const photos = extractPhotos(backendUser);

    return {
        id: backendUser.id || backendUser.uid,
        name: backendUser.basicDetails?.name || backendUser.name || 'Unknown',
        email: backendUser.email || 'No email',
        phone: backendUser.phoneNumber || 'No phone',
        status: mapStatus(backendUser.onboardingStatus, backendUser.isVerified),
        verified: backendUser.isVerified === true || backendUser.isPhoneVerified === true,
        registrationDate: backendUser.createdDate || new Date().toISOString(),
        lastLogin: backendUser.lastActiveAt || backendUser.createdDate || new Date().toISOString(),
        college: college,
        work: work,
        location: formatLocation(backendUser.location),
        profileCompletion: calculateProfileCompletion(backendUser),
        matchCount: backendUser.matches?.length || backendUser.chatCount || 0,

        // Profile details
        age: age,
        gender: backendUser.basicDetails?.gender,
        height: backendUser.basicDetails?.height,
        lookingFor: backendUser.desiredQualities?.lookingFor || backendUser.signalProfile?.relationshipIntent || '',
        preferredGender: backendUser.desiredQualities?.preferredGender || backendUser.desiredQualities?.interestedIn || null,
        interests: backendUser.curatedProfile?.interests || [],
        personalityTraits: backendUser.curatedProfile?.personalityTraits || backendUser.personalDescription?.personalityList || [],
        conversationStyle: backendUser.curatedProfile?.conversationStyleDescription || backendUser.signalProfile?.toneSignature || null,
        aboutMe: bio,
        bio: bio,
        photos: photos,
        onboardingStatus: backendUser.onboardingStatus,
        uid: backendUser.uid,

        // AI Profiles
        signalProfile: backendUser.signalProfile || null,
        matchingProfile: backendUser.matchingProfile || null,
        prompts: backendUser.prompts || {},

        // Store original data for detail view
        _original: backendUser
    };
}

/**
 * Mirror of Java UserPayloadMapper.buildUserModelMap
 * Builds normalized user model payload for Python AI Agent consumption.
 */
function buildUserModelPayload(user) {
    if (!user) return {};
    const orig = user._original || user;
    const basic = orig.basicDetails || {};
    const curated = orig.curatedProfile || {};
    const signals = orig.signalProfile || {};
    const pro = orig.professionalDetails || {};
    const desired = orig.desiredQualities || {};

    const payload = JSON.parse(JSON.stringify(orig));

    payload.uid = user.uid || user.id || orig.uid || orig.id;
    payload.name = user.name || basic.name || orig.name || 'Unknown';

    if (user.age || basic.birthDate) {
        payload.age = user.age || (basic.birthDate ? mapBackendUser(orig).age : undefined);
        if (!payload.basicDetails) payload.basicDetails = {};
        payload.basicDetails.age = payload.age;
    }

    if (user.college && user.college !== 'Not specified') {
        payload.college = user.college;
    } else if (pro.university) {
        payload.college = pro.university;
    }

    if (user.work) {
        payload.work = user.work;
    } else if (pro.titleCompany && pro.companyName) {
        payload.work = `${pro.titleCompany} at ${pro.companyName}`;
    }

    const richBio = user.aboutMe || curated.aboutMe || signals.lifestyleTexture || signals.lifeEnergy || orig.bio || '';
    if (!payload.curatedProfile) payload.curatedProfile = {};
    if (!payload.curatedProfile.aboutMe && richBio) {
        payload.curatedProfile.aboutMe = richBio;
    }
    if (!payload.bio && richBio) {
        payload.bio = richBio;
    }

    const lookingFor = user.lookingFor || desired.lookingFor || signals.relationshipIntent;
    if (lookingFor) {
        payload.lookingFor = lookingFor;
    }

    if (user.personalityTraits && user.personalityTraits.length > 0) {
        payload.personalityTraits = user.personalityTraits;
    }
    if (user.interests && user.interests.length > 0) {
        payload.interests = user.interests;
    }
    if (user.conversationStyle) {
        payload.conversationStyle = user.conversationStyle;
    }

    return payload;
}

/**
 * Mirror of Java UserPayloadMapper.buildSignalsMap
 */
function buildSignalsPayload(user) {
    if (!user) return {};
    const orig = user._original || user;
    return orig.signalProfile || {};
}

/**
 * Maps array of backend users to dashboard format
 * @param {Array} backendUsers - Array of user objects from backend
 * @returns {Array} Array of transformed user objects
 */
function mapBackendUsers(backendUsers) {
    if (!Array.isArray(backendUsers)) {
        console.error('Expected array of users, got:', typeof backendUsers);
        return [];
    }

    return backendUsers.map(mapBackendUser).filter(user => user !== null);
}

// Export mapper functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mapBackendUser, mapBackendUsers, buildUserModelPayload, buildSignalsPayload };
}
