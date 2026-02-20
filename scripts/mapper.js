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
    const extractCollege = (user) => {
        if (user.professionalDetails) {
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

    return {
        id: backendUser.id || backendUser.uid,
        name: backendUser.basicDetails?.name || backendUser.name || 'Unknown',
        email: backendUser.email || 'No email',
        phone: backendUser.phoneNumber || 'No phone',
        status: mapStatus(backendUser.onboardingStatus, backendUser.isVerified),
        verified: backendUser.isVerified === true || backendUser.isPhoneVerified === true,
        registrationDate: backendUser.createdDate || new Date().toISOString(),
        lastLogin: backendUser.lastActiveAt || backendUser.createdDate || new Date().toISOString(),
        college: extractCollege(backendUser),
        location: formatLocation(backendUser.location),
        profileCompletion: calculateProfileCompletion(backendUser),
        matchCount: backendUser.matches?.length || backendUser.chatCount || 0,

        // Additional fields that might be useful (extensible!)
        age: calculateAge(backendUser.basicDetails?.birthDate),
        gender: backendUser.basicDetails?.gender,
        lookingFor: backendUser.desiredQualities?.lookingFor,
        preferredGender: backendUser.desiredQualities?.preferredGender || backendUser.desiredQualities?.interestedIn || null,
        interests: backendUser.curatedProfile?.interests || [],
        conversationStyle: backendUser.curatedProfile?.conversationStyleDescription || null,
        onboardingStatus: backendUser.onboardingStatus,
        uid: backendUser.uid,

        // Store original data for detail view
        _original: backendUser
    };
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

// Export mapper function
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { mapBackendUser, mapBackendUsers };
}
