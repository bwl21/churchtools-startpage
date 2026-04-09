<script setup lang="ts">
import { Card, Tag } from '@churchtools/styleguide';
import {
    DomainObjectGroup,
    GroupMember,
    useCurrentUser,
} from '@churchtools/utils';
import useGroupMemberfields from '../composables/useGroupMemberfields';
import { computed, onMounted, ref, toRef } from 'vue';
import useGroupMembers from '../composables/useGroupMembers';

const props = defineProps<{
    gms: GroupMember & { group: DomainObjectGroup };
    showStatus?: boolean;
}>();

const groupId = computed(() =>
    parseInt(props.gms.group.domainIdentifier || '0')
);
const { fields, requiredFields } = useGroupMemberfields(groupId);
const currentUser = useCurrentUser();

const { getMyMembership } = useGroupMembers(
    groupId,
    toRef(() => currentUser?.person?.lastName)
);
const myMembership = ref<GroupMember>();
const isLoading = ref(true);
onMounted(async () => {
    myMembership.value = await getMyMembership();
    isLoading.value = false;
});

const defaultValues = ['bitte wählen', 'bitte ausfüllen', 'eingeladen'];
const fieldsCompleted = computed(() => {
    if (!myMembership.value?.fields || !requiredFields.value?.length) {
        return 'no-fields';
    }
    const hasAbgesagt = requiredFields.value.some((f) => {
        const res = myMembership.value?.fields?.find((ff) => {
            const isAbgesagt = Array.isArray(ff.value)
                ? !!ff.value.filter((v) => v.toLowerCase().includes('abgesagt'))
                      .length
                : ff.value?.toString().toLowerCase().includes('abgesagt');
            return ff.id === f.id && isAbgesagt;
        });
        return !!res;
    });
    if (hasAbgesagt) {
        return true;
    }
    return requiredFields.value.every((f) => {
        const res = myMembership.value?.fields?.find((ff) => {
            const hasValue = Array.isArray(ff.value)
                ? !!ff.value.filter((v) => !!v && !defaultValues.includes(v))
                      .length
                : !!ff.value && !defaultValues.includes(ff.value);
            return (
                ff.id === f.id &&
                ((hasValue && f.fieldTypeCode !== 'checkbox') || ff.value == 1)
            );
        });
        return !!res;
    });
});

const tag = computed(() => {
    if (fieldsCompleted.value === 'no-fields') {
        return {
            color: 'basic',
            label: 'Optionale Angaben',
        };
    }
    if (fieldsCompleted.value) {
        return {
            color: 'green',
            label: 'Angaben vollständig',
            icon: 'fas fa-circle-check' as const,
        };
    }
    return {
        class: 'pjta-required',
        color: 'red',
        label: 'Angaben unvollständig',
        icon: 'fas fa-circle-exclamation' as const,
    };
});

const statuses = {
    eingeladen: { color: 'yellow', icon: 'fas fa-envelope' },
    'diesmal abgesagt': { color: 'red', icon: 'fas fa-ban' },
    'immer abgesagt': { color: 'red', icon: 'fas fa-ban' },
    zugesagt: { color: 'green', icon: 'fas fa-circle-check' },
};

const statusTag = computed(() => {
    const statusField = fields.value?.find(
        (f) => f.key === 'Zu-/Absage Mitarbeit'
    );
    if (!statusField || !myMembership.value?.fields) {
        return {
            label: 'Eingeladen',
            color: 'yellow',
            icon: 'fas fa-envelope',
        };
    }
    const statusIndex = myMembership.value.fields.findIndex(
        (f) => f.id === statusField.id
    );
    const value: string | null =
        myMembership.value?.fields[statusIndex]?.value ?? null;

    return {
        label: value ?? 'Eingeladen',
        color: statuses[value as keyof typeof statuses]?.color ?? 'yellow',
        icon: (statuses[value as keyof typeof statuses]?.icon ??
            'fas fa-envelope') as any,
    };
});
</script>
<template>
    <Card style="--card-px: 24px; --card-py: 12px" class="hover:bg-gray-100">
        <RouterLink
            :to="{
                name: 'my-group',
                params: {
                    groupId: gms.group.domainIdentifier,
                },
            }"
        >
            <div class="flex justify-between items-center text-base">
                <div>
                    <span class="text-bold">
                        {{ gms.group.title }}
                    </span>
                </div>
                <div v-if="isLoading">
                    <i class="fas fa-spinner fa-pulse text-gray-500 ml-3"></i>
                </div>
                <div v-else class="flex items-center gap-2">
                    <Tag v-if="showStatus" v-bind="statusTag" size="0" />
                    <Tag v-bind="tag" size="S" />
                    <i class="fas fa-chevron-right text-gray-500 ml-3"></i>
                </div>
            </div>
        </RouterLink>
    </Card>
</template>
